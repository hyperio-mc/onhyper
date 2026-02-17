#!/usr/bin/env python3
"""Create intro, chat demo, and outro slides for OnHyper agent video."""

from PIL import Image, ImageDraw, ImageFont
import os

# Dimensions
WIDTH = 1920
HEIGHT = 1080

# Brand colors
INDIGO = (99, 102, 241)  # #6366f1
CYAN = (34, 211, 238)    # #22d3ee
DARK_BG = (26, 26, 46)   # #1a1a2e
WHITE = (255, 255, 255)
DARKER_BG = (15, 15, 30)

def get_font(size, bold=False):
    """Get a font, falling back to default if necessary."""
    font_names = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for font_name in font_names:
        if os.path.exists(font_name):
            try:
                return ImageFont.truetype(font_name, size)
            except:
                pass
    return ImageFont.load_default()

def create_intro_slide():
    """Create the intro slide image."""
    img = Image.new('RGB', (WIDTH, HEIGHT), DARK_BG)
    draw = ImageDraw.Draw(img)
    
    # Title - OnHyper
    title_font = get_font(96, bold=True)
    title = "OnHyper"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    title_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - title_w) // 2, HEIGHT // 2 - 120), title, font=title_font, fill=INDIGO)
    
    # Tagline
    tagline_font = get_font(42)
    tagline = "Where Agents Ship Code"
    bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - tagline_w) // 2, HEIGHT // 2 + 20), tagline, font=tagline_font, fill=WHITE)
    
    # URL
    url_font = get_font(36)
    url = "onhyper.io"
    bbox = draw.textbbox((0, 0), url, font=url_font)
    url_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - url_w) // 2, HEIGHT // 2 + 100), url, font=url_font, fill=CYAN)
    
    return img

def create_chat_demo_frame(progress, phase):
    """Create a chat demo frame at given progress (0.0 to 1.0)."""
    img = Image.new('RGB', (WIDTH, HEIGHT), DARKER_BG)
    draw = ImageDraw.Draw(img)
    
    # Chat window dimensions
    chat_left = 160
    chat_top = 80
    chat_width = 1600
    chat_height = 920
    
    # Draw chat window background
    draw.rounded_rectangle(
        [chat_left, chat_top, chat_left + chat_width, chat_top + chat_height],
        radius=20,
        fill=DARK_BG,
        outline=(50, 50, 80),
        width=2
    )
    
    # Chat header
    draw.rectangle([chat_left, chat_top, chat_left + chat_width, chat_top + 60], fill=(40, 40, 70))
    header_font = get_font(28, bold=True)
    draw.text((chat_left + 30, chat_top + 15), "OnHyper Agent Chat", font=header_font, fill=WHITE)
    status_font = get_font(20)
    draw.text((chat_left + chat_width - 180, chat_top + 20), "● Online", font=status_font, fill=CYAN)
    
    # User message bubble (always visible after phase 0)
    user_msg = "Can you build me a todo app?"
    user_font = get_font(26)
    
    # User bubble
    user_bubble_left = chat_left + chat_width - 650
    user_bubble_top = chat_top + 100
    user_bubble_width = 600
    user_bubble_height = 60
    
    if phase >= 0:
        alpha = min(1.0, progress * 4) if phase == 0 else 1.0
        # Simplified - just draw the bubble
        draw.rounded_rectangle(
            [user_bubble_left, user_bubble_top, user_bubble_left + user_bubble_width, user_bubble_top + user_bubble_height],
            radius=15,
            fill=(60, 60, 100)
        )
        draw.text((user_bubble_left + 20, user_bubble_top + 15), user_msg, font=user_font, fill=WHITE)
        
        # User label
        label_font = get_font(18)
        draw.text((user_bubble_left + 20, user_bubble_top - 22), "You", font=label_font, fill=(150, 150, 180))
    
    # Agent response area
    agent_bubble_left = chat_left + 50
    agent_bubble_top = chat_top + 220
    agent_bubble_width = 800
    agent_bubble_height = 500
    
    if phase >= 1:
        # Agent bubble
        draw.rounded_rectangle(
            [agent_bubble_left, agent_bubble_top, agent_bubble_left + agent_bubble_width, agent_bubble_top + agent_bubble_height],
            radius=15,
            fill=(35, 35, 60)
        )
        
        # Agent label
        label_font = get_font(18)
        draw.text((agent_bubble_left + 20, agent_bubble_top - 22), "🤖 OnHyper Agent", font=label_font, fill=CYAN)
        
        # Agent response text with typing effect
        agent_response = """I've created your todo app! 🎉

It's now live and ready to use at:
onhyper.io/a/your-todo-app

Features included:
✓ Add, edit, delete todos
✓ Mark as complete
✓ Local storage persistence
✓ Responsive design

Your app is deployed and ready!"""
        
        # Calculate how much text to show based on progress
        if phase == 1:
            chars_to_show = int(len(agent_response) * min(1.0, progress * 1.5))
            visible_text = agent_response[:chars_to_show]
            # Add cursor if still typing
            if chars_to_show < len(agent_response):
                visible_text += "▌"
        else:
            visible_text = agent_response
        
        # Draw agent text
        text_font = get_font(24)
        lines = visible_text.split('\n')
        y_offset = agent_bubble_top + 30
        for line in lines:
            draw.text((agent_bubble_left + 30, y_offset), line, font=text_font, fill=WHITE)
            y_offset += 36
    
    # App preview section (phase 2)
    if phase >= 2:
        preview_left = chat_left + chat_width - 550
        preview_top = chat_top + 200
        preview_width = 500
        preview_height = 600
        
        # App preview window
        draw.rounded_rectangle(
            [preview_left, preview_top, preview_left + preview_width, preview_top + preview_height],
            radius=15,
            fill=(25, 25, 50),
            outline=CYAN,
            width=2
        )
        
        # App header
        draw.rectangle([preview_left, preview_top, preview_left + preview_width, preview_top + 50], fill=INDIGO)
        app_title_font = get_font(22, bold=True)
        draw.text((preview_left + 20, preview_top + 12), "📝 Your Todo App", font=app_title_font, fill=WHITE)
        
        # App content - todo items
        todo_font = get_font(20)
        todos = [
            ("☐ Build landing page", True),
            ("☑ Create API endpoints", True),
            ("☐ Add user auth", False),
            ("☑ Deploy to production", True),
        ]
        
        y_offset = preview_top + 70
        opacity = min(1.0, progress * 2) if phase == 2 else 1.0
        for todo, done in todos[:int(len(todos) * opacity)]:
            color = CYAN if done else WHITE
            draw.text((preview_left + 30, y_offset), todo, font=todo_font, fill=color)
            y_offset += 50
        
        # URL display
        if phase == 2 and progress > 0.5:
            url_font = get_font(18)
            draw.text((preview_left + 30, preview_top + preview_height - 50), "🔗 onhyper.io/a/your-todo-app", font=url_font, fill=CYAN)
    
    return img

def create_outro_slide():
    """Create the outro slide image."""
    img = Image.new('RGB', (WIDTH, HEIGHT), DARK_BG)
    draw = ImageDraw.Draw(img)
    
    # Main CTA
    cta_font = get_font(72, bold=True)
    cta = "Start Building Today"
    bbox = draw.textbbox((0, 0), cta, font=cta_font)
    cta_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - cta_w) // 2, HEIGHT // 2 - 150), cta, font=cta_font, fill=WHITE)
    
    # Free tier info
    free_font = get_font(36)
    free_text = "Free Tier: 100 requests/day, 3 apps"
    bbox = draw.textbbox((0, 0), free_text, font=free_font)
    free_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - free_w) // 2, HEIGHT // 2 - 20), free_text, font=free_font, fill=CYAN)
    
    # URL
    url_font = get_font(56, bold=True)
    url = "onhyper.io"
    bbox = draw.textbbox((0, 0), url, font=url_font)
    url_w = bbox[2] - bbox[0]
    draw.text(((WIDTH - url_w) // 2, HEIGHT // 2 + 80), url, font=url_font, fill=INDIGO)
    
    return img

def main():
    """Generate all slide images and frame sequences."""
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create intro frame sequence (5 seconds at 30fps = 150 frames)
    print("Creating intro frames...")
    intro_img = create_intro_slide()
    os.makedirs(f"{output_dir}/intro", exist_ok=True)
    for i in range(150):
        # Apply fade effect
        frame = intro_img.copy()
        if i < 30:  # Fade in
            frame = Image.blend(Image.new('RGB', (WIDTH, HEIGHT), DARK_BG), frame, i / 30)
        elif i > 120:  # Fade out
            frame = Image.blend(frame, Image.new('RGB', (WIDTH, HEIGHT), DARK_BG), (i - 120) / 30)
        frame.save(f"{output_dir}/intro/frame_{i:04d}.png")
    print(f"  Created 150 intro frames")
    
    # Create chat demo frames (12 seconds at 30fps = 360 frames)
    print("Creating chat demo frames...")
    os.makedirs(f"{output_dir}/chat", exist_ok=True)
    
    total_frames = 360
    phase_frames = [90, 180, 90]  # User message, typing response, preview
    frame_idx = 0
    
    for phase, frames in enumerate(phase_frames):
        for i in range(frames):
            progress = i / frames
            frame = create_chat_demo_frame(progress, phase)
            frame.save(f"{output_dir}/chat/frame_{frame_idx:04d}.png")
            frame_idx += 1
    print(f"  Created {frame_idx} chat demo frames")
    
    # Create outro frame sequence (6 seconds at 30fps = 180 frames)
    print("Creating outro frames...")
    outro_img = create_outro_slide()
    os.makedirs(f"{output_dir}/outro", exist_ok=True)
    for i in range(180):
        frame = outro_img.copy()
        if i < 30:  # Fade in
            frame = Image.blend(Image.new('RGB', (WIDTH, HEIGHT), DARK_BG), frame, i / 30)
        elif i > 150:  # Fade out
            frame = Image.blend(frame, Image.new('RGB', (WIDTH, HEIGHT), DARK_BG), (i - 150) / 30)
        frame.save(f"{output_dir}/outro/frame_{i:04d}.png")
    print(f"  Created 180 outro frames")
    
    print("All frames generated successfully!")

if __name__ == "__main__":
    main()