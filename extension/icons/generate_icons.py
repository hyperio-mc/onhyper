#!/usr/bin/env python3
"""
Generate colored icon sets for the extension status indicator.
Creates icons for: green (unlocked), yellow (locked), red (error), gray (empty)
"""

from PIL import Image, ImageDraw
import os

# Sizes to generate
SIZES = [16, 48, 128]

# Color definitions (hex)
COLORS = {
    'green': '#22c55e',   # Keys configured, unlocked
    'yellow': '#eab308',  # Keys configured, locked (needs password)
    'red': '#ef4444',     # API error detected
    'gray': '#6b7280',    # No keys configured
}

# Output directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def create_icon(size, color_hex, output_path):
    """Create a simple circular icon with an inner design."""
    # Create transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Parse color
    r = int(color_hex[1:3], 16)
    g = int(color_hex[3:5], 16)
    b = int(color_hex[5:7], 16)
    
    # Calculate dimensions
    padding = size // 8
    circle_radius = (size - 2 * padding) // 2
    
    # Draw main circle (filled)
    center = size // 2
    draw.ellipse(
        [center - circle_radius, center - circle_radius, 
         center + circle_radius, center + circle_radius],
        fill=(r, g, b, 255)
    )
    
    # Add a simple "H" like shape (for Hyper/H) inside
    inner_size = circle_radius * 2
    stroke = max(1, size // 16)
    
    # Vertical bars
    bar_width = inner_size // 4
    bar_height = inner_size - stroke * 2
    
    # Left bar
    left_x = center - inner_size // 3
    right_x = center + inner_size // 3
    
    # Draw H-like shape
    # Left vertical
    draw.rectangle(
        [left_x - bar_width//2, center - bar_height//2,
         left_x + bar_width//2, center + bar_height//2],
        fill=(255, 255, 255, 255)
    )
    # Right vertical
    draw.rectangle(
        [right_x - bar_width//2, center - bar_height//2,
         right_x + bar_width//2, center + bar_height//2],
        fill=(255, 255, 255, 255)
    )
    # Horizontal bar
    draw.rectangle(
        [left_x - bar_width//2, center - stroke//2,
         right_x + bar_width//2, center + stroke//2],
        fill=(255, 255, 255, 255)
    )
    
    img.save(output_path)
    print(f'Created: {output_path}')

def main():
    for color_name, color_hex in COLORS.items():
        for size in SIZES:
            filename = f'icon-{color_name}-{size}.png'
            output_path = os.path.join(SCRIPT_DIR, filename)
            create_icon(size, color_hex, output_path)
    
    print('\nAll icons generated successfully!')

if __name__ == '__main__':
    main()