# Video Cuts Plan - 3 Marketing Variations

## Overview

Create 3 different cuts of the OnHyper agent video using existing assets + new music/footage. Each cut has a distinct creative direction.

**Approach:** Use ffmpeg to assemble videos (simpler than Remotion, faster iteration).

---

## Cut 1: Product Launch Energy

**Vibe:** Modern tech product launch, upbeat, exciting

**Tasks:**
- `task-051`: Download upbeat background music (Pixabay/Mixkit)
- `task-052`: Find stock footage - tech screens, developers, coding
- `task-053`: Assemble video with ffmpeg

**Music Direction:**
- Source: Pixabay Music - search "upbeat electronic" or "cinematic background"
- Vibe: Energetic but not overwhelming, modern tech feel
- Duration: 60s to match voiceover

**Footage Direction:**
- Bright, clean tech imagery
- Developers at work, code on screens
- Modern office/startup vibes

**Assembly:**
```bash
# Mix voiceover (100%) + music (15%)
# Interleave stock footage with text overlays
# Use existing video-parts/intro.mp4, outro.mp4 for structure
ffmpeg -i agent-voiceover.mp3 -i music.mp3 -i footage1.mp4 -i footage2.mp4 \
  -filter_complex "[0:a]volume=1.0[voice];[1:a]volume=0.15[music];[voice][music]amix=inputs=2:duration=first:normalize=0[aout]" \
  -map 2:v -map "[aout]" -c:v libx264 -c:a aac output.mp4
```

**Output:** `agent-video-cut1-1920x1080.mp4`

---

## Cut 2: Thought Leader Premium

**Vibe:** Darker, cinematic, sophisticated "premium brand"

**Tasks:**
- `task-054`: Download chill/ambient music (different source than Cut 1)
- `task-055`: Find stock footage - dark mode, data viz, neural networks
- `task-056`: Assemble video with ffmpeg

**Music Direction:**
- Source: Mixkit or Free Music Archive (NOT Pixabay - use different library)
- Vibe: Contemplative, ambient, sophisticated
- Tempo: Slower, more atmospheric

**Footage Direction:**
- Dark backgrounds, glowing data streams
- Abstract neural network visualizations
- High contrast, cinematic lighting

**Script Modification:** Problem → Solution narrative focus
- Emphasize "Your AI agent needs to call OpenAI. Where's the API key?"
- More storytelling, less feature-focused

**Output:** `agent-video-cut2-1920x1080.mp4`

---

## Cut 3: Viral Social Media

**Vibe:** Bold, punchy, Apple-style minimalist, optimized for social

**Tasks:**
- `task-057`: Download high-energy hype music (NCS or Pixabay)
- `task-058`: Find stock footage - dramatic, bold, high contrast
- `task-059`: Assemble video with ffmpeg

**Music Direction:**
- Source: NCS (NoCopyrightSounds) or Pixabay high-energy
- Vibe: Product reveal, announcement energy, builds excitement
- Build up + drop structure

**Footage Direction:**
- Dramatic close-ups, terminal/code shots
- Geometric motion graphics
- High contrast, bold colors

**Script Modification:** Minimal, punchy phrases
- "Ship faster." "Stay secure." "No more exposed keys."
- **Duration: Under 45 seconds** (social media optimized)
- Fast cuts, kinetic typography

**Output:** `agent-video-cut3-1920x1080.mp4`

---

## Existing Assets

**Voiceover:** `onhyper/marketing/agent-voiceover.mp3` (52s)

**Existing Video Parts:**
- `video-parts/intro.mp4` - OnHyper logo intro
- `video-parts/outro.mp4` - CTA outro
- `video-parts/chat.mp4` - Chat demo animation
- `stock-footage/` - 5 stock clips already downloaded

**Scripts:**
- `AGENT_VIDEO_SCRIPT.md` - Full 60s script

---

## Final Step

`task-060`: Upload all 3 cuts to Google Drive and share with tom@hyper.io

---

## Notes for Sub-Agents

1. **Don't set up Remotion** - use ffmpeg directly, it's faster
2. **Reuse existing assets** - the intro/outro/chat videos are already rendered
3. **Music volume** - keep at 10-15% so voiceover is clear
4. **Test audio levels** - use `ffmpeg -i output.mp4 -af "volumedetect" -f null /dev/null` to check
5. **Free music sources** - see `free-electronic-beats.md` in workspace for links