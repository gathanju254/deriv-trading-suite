# backend/src/core/signal_consensus.py
from typing import List, Dict
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from src.config.settings import settings
from src.utils.logger import logger
import numpy as np
import os
import joblib


class MLConsensus:
    """Machine learning-based consensus handler - FIXED for side prediction"""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data: List[List[float]] = []
        self.labels: List[str] = []  # Now: "PUT" or "CALL" (fixed vocabulary)

    def extract_features(self, signals: List[Dict], current_price: float, session_open: float = None) -> List[float]:
        """
        Convert signals into numerical features for ML model.
        FIXED: Removed raw price, added normalized features.
        """
        features = []

        # Basic CALL/PUT counts and scores
        call_signals = [s for s in signals if s["side"].upper() == "CALL"]
        put_signals = [s for s in signals if s["side"].upper() == "PUT"]

        features.extend([
            len(call_signals),
            len(put_signals),
            sum(s["score"] for s in call_signals) if call_signals else 0.0,
            sum(s["score"] for s in put_signals) if put_signals else 0.0,
            max([s["score"] for s in call_signals]) if call_signals else 0.0,
            max([s["score"] for s in put_signals]) if put_signals else 0.0,
        ])

        # Strategy-specific signal stats
        for strategy in ["mean_reversion", "momentum", "breakout"]:
            strat_signals = [s for s in signals if s.get("meta", {}).get("strategy") == strategy]
            features.extend([
                len(strat_signals),
                sum(s["score"] for s in strat_signals) if strat_signals else 0.0,
            ])

        # FIXED: Normalized price features (not raw price)
        if session_open and session_open > 0:
            pct_change_from_open = (current_price - session_open) / session_open
            features.append(pct_change_from_open)
        else:
            features.append(0.0)  # Fallback

        # Add signal strength variance (for stability)
        scores = [s["score"] for s in signals]
        if len(scores) > 1:
            features.append(np.var(scores))
        else:
            features.append(0.0)

        return features

    def train(self, features: List[List[float]], labels: List[str]):
        """
        Train or retrain the RandomForest model.
        FIXED: Labels are now "PUT"/"CALL".
        """
        if len(features) < 20:  # Increased threshold
            logger.warning("Not enough samples to train ML consensus model.")
            return

        X = np.array(features)
        y = np.array(labels)

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_scaled, y)
        self.is_trained = True

        # Save model and scaler
        os.makedirs("models", exist_ok=True)
        joblib.dump(self.model, "models/consensus_model.pkl")
        joblib.dump(self.scaler, "models/scaler.pkl")
        logger.info("ML consensus model trained and saved (predicting sides).")

    def predict(self, features: List[float]) -> Dict:
        """
        Predict side and probability using ML model.
        FIXED: Now predicts "PUT" or "CALL".
        """
        if not self.is_trained or self.model is None:
            return None

        try:
            X = np.array([features])
            X_scaled = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)[0]  # "PUT" or "CALL"
            probability = float(np.max(self.model.predict_proba(X_scaled)))
            return {"side": prediction, "score": probability, "method": "ml"}
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return None


class SignalConsensus:
    """Aggregates multiple strategy signals with optional ML consensus - ENHANCED"""

    def __init__(self, min_score: float = None):
        self.min_score = min_score or settings.MIN_CONSENSUS_SCORE
        self.ml_consensus = MLConsensus()
        self.load_ml_model()

    def load_ml_model(self):
        """Load pre-trained ML model if it exists"""
        try:
            if os.path.exists("models/consensus_model.pkl") and os.path.exists("models/scaler.pkl"):
                self.ml_consensus.model = joblib.load("models/consensus_model.pkl")
                self.ml_consensus.scaler = joblib.load("models/scaler.pkl")
                self.ml_consensus.is_trained = True
                logger.info("ML consensus model loaded (side prediction).")
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}")

    def aggregate(
        self,
        signals: List[Dict],
        current_price: float = None,
        session_open: float = None
    ) -> Dict:
        """
        Loss-optimized signal aggregation.
        ML-safe, feature-validated, fallback-protected.
        """

        # ---------------------------------------------------------
        # 0. SANITY CHECK
        # ---------------------------------------------------------
        if not signals:
            return None

        # ---------------------------------------------------------
        # 1. FILTER OUT WEAK SIGNALS
        # ---------------------------------------------------------
        strong = [s for s in signals if s.get("score", 0) >= 0.6]
        if len(strong) < 2:
            return None

        # ---------------------------------------------------------
        # 2. STRATEGY DIVERSITY CHECK
        # ---------------------------------------------------------
        strategies = {s.get("meta", {}).get("strategy") for s in strong}
        if len(strategies) < 2:
            return None

        # ---------------------------------------------------------
        # 3. CONFLICT DETECTION (BIAS SEEKING)
        # Reject only if signals are TOO CLOSE (murky market)
        # ---------------------------------------------------------
        call_signals = [s for s in strong if s["side"].upper() == "CALL"]
        put_signals = [s for s in strong if s["side"].upper() == "PUT"]

        call_strength = sum(s["score"] for s in call_signals)
        put_strength = sum(s["score"] for s in put_signals)

        if call_signals and put_signals:
            total_strength = call_strength + put_strength
            if total_strength > 0:
                conflict_ratio = abs(call_strength - put_strength) / total_strength
                # Reject if market bias is unclear
                if conflict_ratio < 0.30:
                    logger.debug(f"Conflict too close: ratio={conflict_ratio:.2f}")
                    return None

        # ---------------------------------------------------------
        # 4. VOLATILITY FILTER (ANTI-CHOP)
        # ---------------------------------------------------------
        try:
            scores = [s["score"] for s in strong]
            volatility = max(scores) - min(scores)
            if volatility > 0.45:
                logger.debug(f"High signal volatility: {volatility:.2f}")
                return None
        except Exception:
            pass

        # ---------------------------------------------------------
        # 5. TRADITIONAL CONSENSUS (WEIGHTED)
        # ---------------------------------------------------------
        agg = {"CALL": 0.0, "PUT": 0.0}
        for s in strong:
            agg[s["side"].upper()] += float(s.get("score", 0.5))

        if agg["CALL"] == agg["PUT"]:
            return None

        traditional_side = "CALL" if agg["CALL"] > agg["PUT"] else "PUT"
        total = agg["CALL"] + agg["PUT"]
        traditional_score = agg[traditional_side] / total

        if traditional_score < max(self.min_score, 0.55):
            return None

        # ---------------------------------------------------------
        # 6. ML CONSENSUS (VALIDATED + SAFE)
        # ---------------------------------------------------------
        ml_result = None

        if (
            settings.ML_CONSENSUS_ENABLED
            and self.ml_consensus.is_trained
            and current_price is not None
        ):
            try:
                features = self.ml_consensus.extract_features(
                    strong, current_price, session_open
                )

                # DEBUG: Feature validation
                logger.debug(f"ML Features ({len(features)}): {features}")

                EXPECTED_FEATURES = 13
                if len(features) != EXPECTED_FEATURES:
                    logger.warning(
                        f"ML feature mismatch: expected {EXPECTED_FEATURES}, got {len(features)}. "
                        "Falling back to traditional."
                    )
                else:
                    ml_result = self.ml_consensus.predict(features)

            except Exception as e:
                logger.error(f"ML prediction failed: {e}. Falling back to traditional.")

        # ---------------------------------------------------------
        # 7. SMART COMBINATION LOGIC
        # ---------------------------------------------------------
        if ml_result:
            ml_side = ml_result["side"]
            ml_score = ml_result["score"]

            if (
                ml_score >= 0.70
                and ml_side == traditional_side
                and ml_score > traditional_score + 0.05
            ):
                final_side = ml_side
                final_score = ml_score
                method = "ml_override"
            else:
                final_side = traditional_side
                final_score = traditional_score
                method = "traditional"
        else:
            final_side = traditional_side
            final_score = traditional_score
            method = "traditional"

        # ---------------------------------------------------------
        # 8. FINAL OUTPUT
        # ---------------------------------------------------------
        return {
            "side": final_side,
            "score": final_score,
            "sources": len(strong),
            "strategies": list(strategies),
            "method": method,
            "traditional_score": traditional_score,
            "ml_score": ml_result["score"] if ml_result else 0.0,
        }

    def add_training_sample(self, signals: List[Dict], outcome: str, current_price: float, traded_side: str, session_open: float = None):
        """
        Add a labeled sample to ML dataset.
        FIXED: Label is traded_side ("PUT"/"CALL"), not outcome.
        """
        if not settings.ML_CONSENSUS_ENABLED:
            return

        if not signals:
            return

        features = self.ml_consensus.extract_features(signals, current_price, session_open)
        self.ml_consensus.training_data.append(features)
        self.ml_consensus.labels.append(traded_side.upper())  # "PUT" or "CALL"

        # Retrain periodically
        if len(self.ml_consensus.training_data) >= 50:
            self.ml_consensus.train(self.ml_consensus.training_data, self.ml_consensus.labels)
            self.ml_consensus.training_data.clear()
            self.ml_consensus.labels.clear()
            logger.info("ML consensus retrained (side prediction).")

    def generate_consensus_signal(self, strategies, symbol: str, price: float) -> Dict:
        """Generate consensus signal from multiple strategies (unchanged)"""
        try:
            signals = []
            confidences = []
            
            for strategy in strategies:
                signal = strategy.on_tick({"quote": price, "symbol": symbol})
                if signal:
                    signals.append(signal["side"])
                    confidences.append(signal["score"])
            
            if not signals:
                return {"direction": "HOLD", "confidence": 0.0, "strength": 0}
            
            bullish = signals.count("CALL")
            bearish = signals.count("PUT")
            
            direction = "CALL" if bullish > bearish else "PUT" if bearish > bullish else "HOLD"
            confidence = sum(confidences) / len(confidences) if confidences else 0.5
            strength = (max(bullish, bearish) / len(signals)) * 100 if signals else 50
            
            return {
                "direction": direction,
                "confidence": confidence,
                "strength": strength,
                "reason": f"{bullish} call, {bearish} put signals"
            }
        except Exception as e:
            logger.error(f"Consensus signal error: {e}")
            return {"direction": "HOLD", "confidence": 0.0, "strength": 0}