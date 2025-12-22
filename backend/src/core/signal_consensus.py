# backend/src/core/signal_consensus.py

from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from src.config.settings import settings
from src.utils.logger import logger
import numpy as np
import os
import joblib


ALLOWED_SIDES = {"RISE", "FALL"}
EXPECTED_FEATURES = 14


# =========================================================
# ML CONSENSUS
# =========================================================
class MLConsensus:
    """Machine learning-based consensus handler (RISE/FALL only)"""

    def __init__(self):
        self.model: Optional[RandomForestClassifier] = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data: List[List[float]] = []
        self.labels: List[str] = []  # "RISE" or "FALL"

    # -----------------------------------------------------
    # FEATURE EXTRACTION
    # -----------------------------------------------------
    def extract_features(
        self,
        signals: List[Dict],
        current_price: float,
        session_open: float = None,
    ) -> List[float]:
        features: List[float] = []

        rise_signals = [s for s in signals if s.get("side", "").upper() == "RISE"]
        fall_signals = [s for s in signals if s.get("side", "").upper() == "FALL"]

        # Directional stats
        features.extend([
            len(rise_signals),
            len(fall_signals),
            sum(s["score"] for s in rise_signals) if rise_signals else 0.0,
            sum(s["score"] for s in fall_signals) if fall_signals else 0.0,
            max([s["score"] for s in rise_signals]) if rise_signals else 0.0,
            max([s["score"] for s in fall_signals]) if fall_signals else 0.0,
        ])

        # Strategy-level stats
        for strategy in ("mean_reversion", "momentum", "breakout"):
            strat_signals = [
                s for s in signals
                if s.get("meta", {}).get("strategy") == strategy
            ]
            features.extend([
                len(strat_signals),
                sum(s["score"] for s in strat_signals) if strat_signals else 0.0,
            ])

        # Normalized price movement
        if session_open and session_open > 0:
            features.append((current_price - session_open) / session_open)
        else:
            features.append(0.0)

        # Signal variance (chop detector)
        scores = [s["score"] for s in signals]
        features.append(np.var(scores) if len(scores) > 1 else 0.0)

        return features

    # -----------------------------------------------------
    # TRAINING
    # -----------------------------------------------------
    def train(self, features: List[List[float]], labels: List[str]):
        if len(features) < 20:
            logger.warning("Not enough samples to train ML consensus model.")
            return

        X = np.array(features)
        y = np.array(labels)

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)

        self.model = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
        )
        self.model.fit(X_scaled, y)
        self.is_trained = True

        os.makedirs("models", exist_ok=True)
        joblib.dump(self.model, "models/consensus_model.pkl")
        joblib.dump(self.scaler, "models/scaler.pkl")

        logger.info("ML consensus model trained (RISE/FALL prediction).")

    # -----------------------------------------------------
    # PREDICTION
    # -----------------------------------------------------
    def predict(self, features: List[float]) -> Optional[Dict]:
        if not self.is_trained or self.model is None:
            return None

        try:
            X = self.scaler.transform([features])
            side = self.model.predict(X)[0]
            score = float(np.max(self.model.predict_proba(X)))
            return {
                "side": side,
                "score": score,
                "method": "ml",
            }
        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return None


# =========================================================
# SIGNAL CONSENSUS
# =========================================================
class SignalConsensus:
    """Aggregates multiple strategy signals (RISE/FALL only)"""

    def __init__(self, min_score: float = None):
        self.min_score = min_score or settings.MIN_CONSENSUS_SCORE
        self.ml_consensus = MLConsensus()
        self._load_ml_model()

    # -----------------------------------------------------
    # LOAD ML MODEL
    # -----------------------------------------------------
    def _load_ml_model(self):
        try:
            if (
                os.path.exists("models/consensus_model.pkl")
                and os.path.exists("models/scaler.pkl")
            ):
                self.ml_consensus.model = joblib.load("models/consensus_model.pkl")
                self.ml_consensus.scaler = joblib.load("models/scaler.pkl")
                self.ml_consensus.is_trained = True
                logger.info("ML consensus model loaded.")
        except Exception as e:
            logger.warning(f"ML model load failed: {e}")

    # -----------------------------------------------------
    # AGGREGATION CORE
    # -----------------------------------------------------
    def aggregate(
        self,
        signals: List[Dict],
        current_price: float = None,
        session_open: float = None,
    ) -> Optional[Dict]:

        if not signals or len(signals) < 2:
            return None

        strong = [
            s for s in signals
            if float(s.get("score", 0)) >= 0.6
            and s.get("side", "").upper() in ALLOWED_SIDES
        ]

        if len(strong) < 2:
            return None

        strategies = {
            s.get("meta", {}).get("strategy")
            for s in strong
        }
        if len(strategies) < 2:
            return None

        rise_strength = sum(
            s["score"] for s in strong if s["side"].upper() == "RISE"
        )
        fall_strength = sum(
            s["score"] for s in strong if s["side"].upper() == "FALL"
        )

        if rise_strength and fall_strength:
            total = rise_strength + fall_strength
            if abs(rise_strength - fall_strength) / total < 0.30:
                return None

        scores = [s["score"] for s in strong]
        if max(scores) - min(scores) > 0.45:
            return None

        agg = {"RISE": 0.0, "FALL": 0.0}
        for s in strong:
            agg[s["side"].upper()] += s["score"]

        if agg["RISE"] == agg["FALL"]:
            return None

        traditional_side = "RISE" if agg["RISE"] > agg["FALL"] else "FALL"
        total_weight = agg["RISE"] + agg["FALL"]
        traditional_score = agg[traditional_side] / total_weight

        if traditional_score < max(self.min_score, 0.55):
            return None

        ml_result = None
        if (
            settings.ML_CONSENSUS_ENABLED
            and self.ml_consensus.is_trained
            and current_price is not None
        ):
            features = self.ml_consensus.extract_features(
                strong, current_price, session_open
            )
            if len(features) == EXPECTED_FEATURES:
                ml_result = self.ml_consensus.predict(features)

        final_side = traditional_side
        final_score = traditional_score
        method = "traditional"

        if ml_result:
            if (
                ml_result["side"] == traditional_side
                and ml_result["score"] >= 0.70
                and ml_result["score"] >= traditional_score + 0.05
            ):
                final_side = ml_result["side"]
                final_score = ml_result["score"]
                method = "ml_override"

        return {
            "side": final_side,
            "score": round(final_score, 4),
            "sources": len(strong),
            "strategies": list(strategies),
            "method": method,
            "traditional_score": round(traditional_score, 4),
            "ml_score": round(ml_result["score"], 4) if ml_result else 0.0,
        }

    # -----------------------------------------------------
    # ML TRAINING HOOK (REQUIRED BY OrderExecutor)
    # -----------------------------------------------------
    def add_training_sample(
        self,
        signals: List[Dict],
        outcome: str,
        current_price: float,
        traded_side: str,
        session_open: float = None,
    ):
        if not settings.ML_CONSENSUS_ENABLED:
            return

        if not signals:
            return

        side = traded_side.upper()
        if side not in ALLOWED_SIDES:
            return

        features = self.ml_consensus.extract_features(
            signals, current_price, session_open
        )

        if len(features) != EXPECTED_FEATURES:
            logger.warning(
                f"ML training skipped: feature mismatch ({len(features)})"
            )
            return

        self.ml_consensus.training_data.append(features)
        self.ml_consensus.labels.append(side)

        if len(self.ml_consensus.training_data) >= 50:
            self.ml_consensus.train(
                self.ml_consensus.training_data,
                self.ml_consensus.labels,
            )
            self.ml_consensus.training_data.clear()
            self.ml_consensus.labels.clear()
            logger.info("ML consensus retrained.")
