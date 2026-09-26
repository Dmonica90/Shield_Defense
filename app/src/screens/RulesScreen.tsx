import { Button, Scene, Stagger, StaggerItem } from '../components/ui';
import { useLanguage } from '../i18n/LanguageProvider';

/** The five Zero Trust principles and how the rounds work. */
export function RulesScreen({ onDone }: { onDone: (skipped: boolean) => void }) {
  const { story } = useLanguage();
  const { rules } = story;

  return (
    <Scene>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-accent uppercase">{rules.label}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{rules.title}</h1>
          <p className="mt-2 text-ink-dim">{rules.subtitle}</p>
        </div>

        <Stagger as="ol" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rules.items.map((item, i) => (
            <StaggerItem as="li" key={item.title} className="panel rounded-2xl p-5">
              <p className="font-mono text-sm text-clip">0{i + 1}</p>
              <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 font-mono text-sm text-accent">{item.question}</p>
              <p className="mt-2 text-sm text-ink-dim">{item.text}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <section className="panel rounded-2xl p-5">
          <h2 className="text-lg font-semibold">{rules.howTitle}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-ink-dim">
            {rules.how.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-accent">▸</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Button tone="quiet" onClick={() => onDone(true)}>
            {rules.skip}
          </Button>
          <Button onClick={() => onDone(false)} sfx="confirm">
            {rules.continue}
          </Button>
        </div>
      </div>
    </Scene>
  );
}
