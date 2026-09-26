import { Scene } from '../components/ui';
import { useLanguage } from '../i18n/LanguageProvider';
import { ShieldMark } from './LoadingScreen';

/** Where the player lands after leaving: nothing more to do but close the window. */
export function EndedScreen({ message }: { message: string }) {
  const { story } = useLanguage();
  return (
    <Scene>
      <div className="m-auto flex max-w-md flex-col items-center gap-4 text-center" role="status">
        <ShieldMark className="h-20 w-16" />
        <p className="font-mono text-xs tracking-[0.3em] text-clip uppercase">
          {story.meta.brand} · {story.meta.title}
        </p>
        <p className="text-lg">{message}</p>
      </div>
    </Scene>
  );
}
