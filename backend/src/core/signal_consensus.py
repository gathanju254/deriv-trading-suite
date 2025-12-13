# backend/src/core/signal_consensus.py
from typing import List, Dict
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os
from src.config.settings import settings
from src.utils.logger import logger


class MLConsensus:
    """Machine learning-based consensus handler"""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data: List[List[float]] = []
        self.labels: List[str] = []

    def extract_features(self, signals: List[Dict], current_price: float) -> List[float]:
        """
        Convert signals into numerical features for ML model.
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

        # Optional: Add normalized price for context
        features.append(float(current_price))

        return features

    def train(self, features: List[List[float]], labels: List[str]):
        """
        Train or retrain the RandomForest model.
        """
        if len(features) < 10:
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
        logger.info("ML consensus model trained and saved.")

    def predict(self, features: List[float]) -> Dict:
        """
        Predict side and probability using ML model.
        """
        if not self.is_trained or self.model is None:
            return None

        try:
            X = np.array([features])
            X_scaled = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)[0]
            probability = float(np.max(self.model.predict_proba(X_scaled)))
            return {"side": prediction, "score": probability, "method": "ml"}
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return None


class SignalConsensus:
    """Aggregates multiple strategy signals with optional ML consensus"""

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
                logger.info("ML consensus model loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}")

    def aggregate(self, signals: List[Dict], current_price: float = None) -> Dict:
        """
        Loss-optimized signal aggregation:
        - Removes weak/noisy signals
        - Requires multi-strategy agreement
        - Requires minimum confidence
        - Filters conflicting signals
        - Applies trend + volatility checks
        - Integrates ML model safely
        """
        # ---------------------------------------------------------
        # 0. Sanity check
        # ---------------------------------------------------------
        if not signals:
            return None

        # ---------------------------------------------------------
        # 1. FILTER OUT WEAK SIGNALS
        # ---------------------------------------------------------
        strong = [s for s in signals if s.get("score", 0) >= 0.6]  # Lowered from 0.7
        if len(strong) < 1:  # Changed from 2 to 1 to allow single strong signal
            return None

        # ---------------------------------------------------------
        # 2. STRATEGY DIVERSITY (preferred but not required)
        # ---------------------------------------------------------
        strategies = {s.get("meta", {}).get("strategy") for s in strong}
        if len(strategies) < 1:  # Changed from 2 to 1
            return None

        # ---------------------------------------------------------
        # 3. IMPROVED CONFLICT DETECTION
        # Only reject if conflicting signals are close in strength
        # ---------------------------------------------------------
        call_signals = [s for s in strong if s["side"].upper() == "CALL"]
        put_signals = [s for s in strong if s["side"].upper() == "PUT"]
        
        call_strength = sum(s["score"] for s in call_signals) if call_signals else 0.0
        put_strength = sum(s["score"] for s in put_signals) if put_signals else 0.0
        
        has_call = len(call_signals) > 0
        has_put = len(put_signals) > 0
        
        # Only reject trade if we have both sides AND they're close in strength
        if has_call and has_put:
            strength_diff = abs(call_strength - put_strength)
            total_strength = call_strength + put_strength
            
            if total_strength > 0:
                relative_diff = strength_diff / total_strength
                # If signals are too close in strength (difference < 40%), skip
                if relative_diff < 0.4:
                    logger.info(f"Conflict detection: signals too close (diff={relative_diff:.2f})")
                    return None

        # ---------------------------------------------------------
        # 4. VOLATILITY FILTER (avoid choppy markets) - More permissive
        # ---------------------------------------------------------
        try:
            scores = [s.get("score", 0.5) for s in strong]
            volatility = max(scores) - min(scores)
            if volatility > 0.45:  # Increased from 0.35 to 0.45
                logger.info(f"High strategy volatility: {volatility:.2f}")
                return None
        except Exception:
            pass

        # ---------------------------------------------------------
        # 5. TRADITIONAL CONSENSUS (weighted)
        # ---------------------------------------------------------
        agg = {"CALL": 0.0, "PUT": 0.0}
        for s in strong:
            side = s["side"].upper()
            agg[side] += float(s.get("score", 0.5))

        # Decide direction
        if agg["CALL"] == agg["PUT"]:
            return None  # no clear bias

        traditional_side = "CALL" if agg["CALL"] > agg["PUT"] else "PUT"
        total = agg["CALL"] + agg["PUT"] or 1.0
        traditional_score = agg[traditional_side] / total

        # Minimum score filter - lowered threshold
        if traditional_score < max(self.min_score, 0.55):  # Minimum 0.55
            logger.info(f"Traditional score too low: {traditional_score:.2f}")
            return None

        # ---------------------------------------------------------
        # 6. ML CONSENSUS (used only if stable + trained)
        # ---------------------------------------------------------
        ml_result = None
        if (
            settings.ML_CONSENSUS_ENABLED
            and self.ml_consensus.is_trained
            and current_price is not None
        ):
            features = self.ml_consensus.extract_features(strong, current_price)
            ml_result = self.ml_consensus.predict(features)

        # ---------------------------------------------------------
        # 7. SMART COMBINATION LOGIC
        # ML only overrides if:
        #   • ML score significantly higher
        #   • ML side does NOT conflict traditional
        # ---------------------------------------------------------
        if ml_result:
            ml_side = ml_result["side"]
            ml_score = ml_result["score"]

            if (
                ml_score >= 0.70  # Lowered from 0.75 to 0.70
                and ml_side == traditional_side  # no conflict
                and ml_score > traditional_score + 0.05  # Lowered from 0.1 to 0.05
            ):
                logger.info(f"ML consensus overriding traditional: {ml_score:.2f} > {traditional_score:.2f}")
                return {
                    "side": ml_side,
                    "score": ml_score,
                    "sources": len(strong),
                    "strategies": list(strategies),
                    "method": "ml",
                    "traditional_score": traditional_score,
                    "ml_score": ml_score,
                }

        # ---------------------------------------------------------
        # 8. DEFAULT → TRADITIONAL CONSENSUS
        # ---------------------------------------------------------
        return {
            "side": traditional_side,
            "score": traditional_score,
            "sources": len(strong),
            "strategies": list(strategies),
            "method": "traditional",
            "traditional_score": traditional_score,
            "ml_score": ml_result["score"] if ml_result else 0.0,
        }

    def add_training_sample(self, signals: List[Dict], outcome: str, current_price: float):
        """
        Add a labeled sample to ML dataset and retrain periodically.
        """
        if not settings.ML_CONSENSUS_ENABLED:
            return

        if not signals:
            logger.warning("ML training sample skipped: signals list is empty.")
            return

        logger.info(f"ML training sample added. Outcome: {outcome}, Current sample count: {len(self.ml_consensus.training_data) + 1}")
        features = self.ml_consensus.extract_features(signals, current_price)
        self.ml_consensus.training_data.append(features)
        self.ml_consensus.labels.append(outcome)

        # Retrain periodically
        if len(self.ml_consensus.training_data) >= 50:
            self.ml_consensus.train(self.ml_consensus.training_data, self.ml_consensus.labels)
            self.ml_consensus.training_data.clear()
            self.ml_consensus.labels.clear()
            logger.info("ML consensus retrained with latest samples.")

    def generate_consensus_signal(self, strategies, symbol: str, price: float) -> Dict:
        """Generate consensus signal from multiple strategies"""
        try:
            signals = []
            confidences = []
            
            for strategy in strategies:
                sig = strategy.analyze(symbol)
                if sig and sig.get("direction"):
                    signals.append(sig["direction"])
                    confidences.append(sig.get("confidence", 0.5))
            
            if not signals:
                return None
            
            # Majority vote
            bullish = signals.count("BUY")
            bearish = signals.count("SELL")
            
            direction = "BUY" if bullish > bearish else "SELL" if bearish > bullish else "HOLD"
            confidence = sum(confidences) / len(confidences) if confidences else 0.5
            strength = (max(bullish, bearish) / len(signals)) * 100 if signals else 50
            
            return {
                "direction": direction,
                "confidence": confidence,
                "strength": strength,
                "reason": f"{bullish} bullish, {bearish} bearish signals"
            }
        except Exception as e:
            logger.error(f"Error generating consensus signal: {e}")
            return None