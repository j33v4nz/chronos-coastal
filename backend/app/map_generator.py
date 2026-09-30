"""
CHRONOS-COASTAL Spatial GIS 3-Band Raster Synthesizer
Generates 3-band composite false-color GIS images for multimodal vision inspection:
- Red Channel: DEM Slope Gradient > 35 deg (landslide & scarp risks)
- Green Channel: Sentinel-1 C-Band SAR Backscatter Delta <= -3.5dB (specular water & saturated mud)
- Blue Channel: Critical Infrastructure Footprints & Arterial Road Outlines
"""

import io
import math
import random
from typing import Dict, Any, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from app.dataset import get_corridor


class SpatialMapGenerator:
    """
    Synthesizes composite false-color GIS rasters combining DEM slope, SAR radar backscatter,
    and vector infrastructure footprints for multimodal spatial inspection by Gemini 2.5 Flash.
    """

    def __init__(self, width: int = 700, height: int = 700):
        self.width = width
        self.height = height

    def generate_composite_tile(
        self,
        corridor_id: str = "kochi",
        water_depth_m: float = 0.50,
        surge_m: float = 1.85,
        target_facility: Optional[str] = None
    ) -> Image.Image:
        """
        Creates a 3-band RGB image (Red: Slope >35°, Green: SAR Delta <= -3.5dB, Blue: Infrastructure).
        """
        corridor_data = get_corridor(corridor_id)
        assets = corridor_data["assets"]

        # Base numpy canvas
        red_channel = np.zeros((self.height, self.width), dtype=np.uint8)
        green_channel = np.zeros((self.height, self.width), dtype=np.uint8)
        blue_channel = np.zeros((self.height, self.width), dtype=np.uint8)

        # 1. Red Channel: Steep Slope Gradients (>35°)
        # Synthetic riverbank embankments and drainage canals
        y_coords, x_coords = np.ogrid[:self.height, :self.width]

        # Sinuous river channel geometry
        river_center_x = self.width * 0.45 + np.sin(y_coords / 45.0) * 55.0
        river_dist = np.abs(x_coords - river_center_x)

        # Steep riverbank levee slope (high gradient zone at bank edge)
        bank_edge_mask = (river_dist >= 45) & (river_dist <= 75)
        red_channel[bank_edge_mask] = 220

        # Isolated steep topography / drainage canal ditches
        ditch_mask = ((x_coords > self.width * 0.6) & (x_coords < self.width * 0.65) & (y_coords > 180) & (y_coords < 520))
        red_channel[ditch_mask] = 240

        # 2. Green Channel: SAR C-Band Specular Reflectance (Delta sigma0 <= -3.5 dB)
        # Saturated floodplain expanding with rising surge
        flood_width = int(60 + min(180, water_depth_m * 110.0 + surge_m * 25.0))
        water_mask = river_dist <= flood_width
        green_channel[water_mask] = 235

        # Lateral backwater pooling in low depressions
        depression_mask = (x_coords > self.width * 0.52) & (x_coords < self.width * 0.78) & (y_coords > self.height * 0.4) & (y_coords < self.height * 0.7)
        if water_depth_m > 0.25:
            green_channel[depression_mask] = 210

        # Add speckle noise characteristic of synthetic aperture radar (SAR)
        noise = np.random.normal(0, 18, (self.height, self.width)).astype(np.int16)
        noisy_green = np.clip(green_channel.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        green_channel = np.where(water_mask | depression_mask, noisy_green, 15)

        # 3. Assemble RGB image from bands
        composite_rgb = np.stack([red_channel, green_channel, blue_channel], axis=-1)
        img = Image.fromarray(composite_rgb, mode="RGB")
        draw = ImageDraw.Draw(img)

        # 4. Blue Channel: Draw vector infrastructure pads and road corridors
        # Draw arterial road network
        road_y = int(self.height * 0.38)
        draw.line([(0, road_y), (self.width, road_y + 40)], fill=(40, 60, 255), width=7)
        draw.line([(int(self.width * 0.68), 0), (int(self.width * 0.68), self.height)], fill=(40, 60, 255), width=6)

        # Draw critical facility pads with labeling
        target_name = target_facility or assets[0]["name"]
        for idx, asset in enumerate(assets[:6]):
            # Deterministic geospatial placement within canvas
            px = int(self.width * 0.25 + (idx % 3) * (self.width * 0.28) + 20)
            py = int(self.height * 0.25 + (idx // 3) * (self.height * 0.35) + 30)

            # Draw asset footprint
            if asset.get("type") == "hospital":
                draw.rectangle([px - 22, py - 22, px + 22, py + 22], fill=(20, 120, 255), outline=(255, 255, 255), width=2)
                # Draw generator pad
                draw.rectangle([px + 12, py + 12, px + 28, py + 28], fill=(0, 200, 255), outline=(255, 255, 0), width=1)
                draw.text((px - 35, py - 36), asset["id"], fill=(255, 255, 255))
            elif asset.get("type") == "substation":
                draw.rectangle([px - 18, py - 18, px + 18, py + 18], fill=(30, 80, 255), outline=(255, 180, 0), width=2)
                draw.text((px - 30, py - 32), asset["id"], fill=(255, 200, 0))

        # Add visual HUD annotation bar at the bottom
        hud_box = [0, self.height - 40, self.width, self.height]
        draw.rectangle(hud_box, fill=(15, 23, 42))
        hud_text = f"CORRIDOR: {corridor_id.upper()} | COMPOSITE: RED=SLOPE>35° GREEN=SAR DELTA<=-3.5dB BLUE=INFRASTRUCTURE"
        draw.text((15, self.height - 28), hud_text, fill=(148, 163, 184))

        return img

    def get_composite_jpeg_bytes(self, corridor_id: str = "kochi", water_depth_m: float = 0.50, surge_m: float = 1.85) -> bytes:
        """Returns raw JPEG bytes of the generated composite raster."""
        img = self.generate_composite_tile(corridor_id, water_depth_m, surge_m)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()
