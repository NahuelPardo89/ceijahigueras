import { cn } from '@/lib/utils';

export type Tema = 'light' | 'dark';

export function SelectorTema({ tema, onChange }: { tema: Tema; onChange: (tema: Tema) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border p-1" role="group" aria-label="Tema de la pantalla">
      {([['light', 'Claro'], ['dark', 'Oscuro']] as const).map(([valor, etiqueta]) => (
        <button
          key={valor}
          type="button"
          aria-pressed={tema === valor}
          className={cn(
            'h-8 rounded-full px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            tema === valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(valor)}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}
