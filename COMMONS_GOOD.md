# Commons Good Philosophy

> **"Build the memory before the masterpiece."**

This document explains the ethical foundation of the SirTrav A2A Studio and our commitment to transparent, attributed AI collaboration.

---

## 🌍 What is "Commons Good"?

The **Commons Good** is a philosophy rooted in the belief that creative tools, knowledge, and AI capabilities should be:

1. **Transparent** - Users know exactly what AI services contributed to their work
2. **Attributed** - Every AI agent receives proper credit for its contribution
3. **Accessible** - The engine is open-source for others to learn from and build upon
4. **Ethical** - Human creativity remains central; AI augments, never replaces

This approach draws from:
- [Creative Commons](https://creativecommons.org/) - Open licensing for creative works
- [Commons-based Peer Production](https://en.wikipedia.org/wiki/Commons-based_peer_production) - Collaborative creation (Wikipedia, Linux, etc.)
- [Ethical AI Principles](https://www.microsoft.com/en-us/ai/responsible-ai) - Transparency and accountability in AI systems

---

## 🤖 The 7 Agents & Their Contributions

Each agent in the pipeline contributes a specific capability. The **Attribution Agent** compiles these into a credits file for every video produced.

### Agent Contributions

| Agent | Service | Contribution | Attribution |
|-------|---------|--------------|-------------|
| **Director** | Google Gemini | Media curation, theme selection, mood setting | "Media curation powered by Google Gemini" |
| **Writer** | OpenAI GPT-4 | Narrative script generation, storytelling | "Script written with OpenAI GPT-4" |
| **Voice** | ElevenLabs | Text-to-speech synthesis, voice acting | "Voice synthesis by ElevenLabs" |
| **Composer** | Suno AI | Soundtrack generation, beat grid creation | "Music composed with Suno AI" |
| **Editor** | FFmpeg | Video assembly, audio mixing, LUFS mastering | "Video compiled with FFmpeg (open source)" |
| **Attribution** | Internal | Credits compilation, license tracking | "Attribution engine by SirTrav Studio" |
| **Publisher** | AWS/Netlify | Storage, delivery, public access | "Hosted on [platform]" |

### Sample Credits Output

Every video includes a `credits.json` and optional credits slate:

```json
{
  "project_id": "week44",
  "created_at": "2025-12-03T10:30:00Z",
  "commons_good_version": "1.0",
  "ai_contributions": {
    "director": {
      "service": "Google Gemini",
      "contribution": "Curated 12 scenes from memory vault",
      "license": "Google AI Terms of Service"
    },
    "writer": {
      "service": "OpenAI GPT-4",
      "contribution": "Generated 450-word narrative script",
      "license": "OpenAI Usage Policy"
    },
    "voice": {
      "service": "ElevenLabs",
      "contribution": "Synthesized 2:34 of narration",
      "license": "ElevenLabs Creator License"
    },
    "composer": {
      "service": "Suno AI",
      "contribution": "Generated 3:00 ambient soundtrack",
      "license": "Suno Terms of Service"
    },
    "editor": {
      "service": "FFmpeg",
      "contribution": "Assembled final video at -14.2 LUFS",
      "license": "LGPL/GPL (Open Source)"
    }
  },
  "human_contribution": {
    "role": "Creative Director",
    "contribution": "Provided source media, approved final output"
  }
}
```

---

## ⚖️ Licensing Considerations

### AI Service Terms

Each AI service has its own terms regarding generated content:

| Service | Commercial Use | Attribution Required | Content Ownership |
|---------|---------------|---------------------|-------------------|
| OpenAI GPT-4 | ✅ Yes | Recommended | User owns output |
| ElevenLabs | ✅ Yes (paid plans) | Required for some plans | User owns output |
| Suno AI | ✅ Yes (Pro plans) | Varies by plan | Check current terms |
| Google Gemini | ✅ Yes | Check current terms | User owns output |
| FFmpeg | ✅ Yes | Not required | N/A (tool, not content) |

### Our Commitment

Even when attribution isn't legally required, we **always attribute** because:
- It's the ethical thing to do
- It educates users about AI's role in creation
- It supports the AI ecosystem that makes this possible
- It maintains transparency in the creative process

### Output Licensing

Videos created with SirTrav A2A Studio can be licensed however the creator chooses. We recommend:
- **Personal/Non-commercial**: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)
- **Commercial**: Standard copyright with AI attribution
- **Open Source**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## 🤝 How to Contribute

### Use the Engine

1. Fork or clone this repository
2. Follow the [Quick Start](README.md#-quick-start) guide
3. Create your own videos
4. Keep the attribution system intact

### Contribute Code

1. Read the [MASTER.md](MASTER.md) build plan
2. Check open issues on GitHub
3. Submit PRs for bug fixes or features
4. Follow the existing code patterns

### Contribute Ideas

- Open a GitHub Discussion for feature ideas
- Share use cases and examples
- Help improve documentation

### Financial Support

This project is built for the Commons Good. If it helps you:
- Star the repository
- Share it with others
- Consider supporting the AI services we use

---

## 📜 The Commons Good Pledge

By using SirTrav A2A Studio, you agree to:

1. **Maintain Attribution** - Keep the credits system intact in your deployments
2. **Be Transparent** - Don't hide AI's role in content creation
3. **Share Knowledge** - Help others learn from your experience
4. **Respect Terms** - Follow the terms of service of all AI providers
5. **Center Humans** - Remember that AI augments human creativity, not replaces it

---

## 🔗 Resources

- [Creative Commons](https://creativecommons.org/)
- [Open Source Initiative](https://opensource.org/)
- [Partnership on AI](https://partnershiponai.org/)
- [Responsible AI Practices](https://ai.google/responsibility/responsible-ai-practices/)
- [OpenAI Usage Policies](https://openai.com/policies/usage-policies)

---

## 📞 Contact

For questions about the Commons Good philosophy or attribution:
- Open a GitHub Issue
- See [MASTER.md](MASTER.md) for project context

---

*"The best memories are shared memories. The best tools are shared tools."*

**— SirTrav A2A Studio, For the Commons Good**
