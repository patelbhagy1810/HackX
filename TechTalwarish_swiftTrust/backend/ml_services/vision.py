"""
vision.py — SwiftTrust AI Vision Microservice
Runs MobileNetV2 to classify images and detect emergency-related content.

Start with: python vision.py
Runs on:    http://localhost:5001
"""

from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# ── Load MobileNetV2 once at startup ──
print("🤖 Loading MobileNetV2...")
model = tf.keras.applications.MobileNetV2(weights="imagenet")
print("✅ Model ready")

# ── Danger keyword mapping ──
# Maps ImageNet labels → UTE emergency categories
DANGER_KEYWORDS = {
    "fire": ["fire", "flame", "burning", "bonfire", "fireplace", "volcano", "eruption"],
    "flood": ["flood", "water", "river", "lake", "ocean", "wave", "storm", "rain"],
    "accident": ["car", "crash", "ambulance", "wreck", "vehicle", "truck", "bus"],
    "weapon": ["gun", "rifle", "pistol", "knife", "sword", "explosive"],
}

def preprocess_image(image_bytes):
    """Convert raw bytes to MobileNetV2 input tensor."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(
        np.array(img, dtype=np.float32)
    )
    return np.expand_dims(arr, axis=0)

def classify(image_bytes):
    """Run inference and return top predictions."""
    tensor = preprocess_image(image_bytes)
    preds  = model.predict(tensor, verbose=0)
    return tf.keras.applications.mobilenet_v2.decode_predictions(preds, top=5)[0]

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "MobileNetV2", "service": "SwiftTrust Vision"})

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    try:
        image_bytes   = request.files["image"].read()
        top_preds     = classify(image_bytes)

        raw_detections = [
            {"label": label, "confidence": float(conf)}
            for (_, label, conf) in top_preds
        ]

        # ── Check against danger keywords ──
        verified          = False
        detected_category = None
        best_confidence   = 0.0

        for (_, label, conf) in top_preds:
            label_lower = label.lower().replace("_", " ")
            for category, keywords in DANGER_KEYWORDS.items():
                if any(kw in label_lower for kw in keywords):
                    if float(conf) > best_confidence:
                        verified          = True
                        detected_category = category
                        best_confidence   = float(conf)

        print(f"   🔍 Top prediction: {top_preds[0][1]} ({top_preds[0][2]:.2%})")
        if verified:
            print(f"   🚨 Threat detected: {detected_category} ({best_confidence:.2%})")

        return jsonify({
            "verified":          verified,
            "detected_category": detected_category,
            "confidence":        best_confidence,
            "raw_detections":    raw_detections,
        })

    except Exception as e:
        print(f"   ❌ Vision error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 SwiftTrust Vision Service starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)