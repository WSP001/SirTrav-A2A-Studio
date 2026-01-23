import { Composition } from 'remotion';
import { MainComposition } from './compositions/MainComposition';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* 
        The "Magic Registry" 
        Each Composition defined here becomes available to the Render Dispatcher.
        Title: SirTrav A2A Studio - Main Broadcast
      */}
            <Composition
                id="SirTrav-Main"
                component={MainComposition}
                durationInFrames={300} // 10 seconds @ 30fps default
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    title: 'SirTrav A2A Studio',
                    subtitle: 'Automated Agent Architecture',
                }}
            />

            {/* Future: Add more compositions here (e.g., Shorts, Teasers) */}
        </>
    );
};
