/**
 * REMOTION ROOT - The Composition Registry
 * 
 * ⚠️ CRITICAL: New compositions are "ghosts" until registered here!
 * Every composition in compositions/ MUST be imported and added below.
 */
import { Composition } from 'remotion';
import { MainComposition } from './compositions/MainComposition';
import { IntroSlate } from './compositions/IntroSlate';
import { TEMPLATES } from './branding';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* 
        ═══════════════════════════════════════════════════════════════
        THE MAGIC REGISTRY
        Each Composition defined here becomes available to the 
        Render Dispatcher (generate-motion-graphic.ts).
        ═══════════════════════════════════════════════════════════════
      */}

            {/* Main Broadcast Composition (Legacy) */}
            <Composition
                id="SirTrav-Main"
                component={MainComposition}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    title: 'SirTrav A2A Studio',
                    subtitle: 'Automated Agent Architecture',
                }}
            />

            {/* ─────────────────────────────────────────────────────────── */}
            {/*                    TEMPLATE COMPOSITIONS                    */}
            {/* ─────────────────────────────────────────────────────────── */}

            {/* IntroSlate - Bold title card with logo animation */}
            <Composition
                id="IntroSlate"
                component={IntroSlate}
                durationInFrames={TEMPLATES.IntroSlate.duration}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    projectId: 'demo',
                    title: 'Welcome to SirTrav',
                    subtitle: 'Autonomous Video Production',
                    showDate: true,
                    theme: 'default',
                }}
            />

            {/* 
        ───────────────────────────────────────────────────────────
        FUTURE COMPOSITIONS (Add here after creating in compositions/)
        ───────────────────────────────────────────────────────────
        
        <Composition
          id="Changelog"
          component={Changelog}
          durationInFrames={TEMPLATES.Changelog.duration}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{...}}
        />

        <Composition
          id="OutroCredits"
          component={OutroCredits}
          durationInFrames={TEMPLATES.OutroCredits.duration}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{...}}
        />

        <Composition
          id="SocialPromo"
          component={SocialPromo}
          durationInFrames={TEMPLATES.SocialPromo.duration}
          fps={30}
          width={1080}  // Vertical!
          height={1920}
          defaultProps={{...}}
        />
      */}
        </>
    );
};
