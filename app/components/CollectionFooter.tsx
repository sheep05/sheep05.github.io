import { chapters } from "@/lib/catalog";

export default function CollectionFooter({ assetBase, view }: { assetBase: string; view: string }) {
  return (
    <footer className="collection-footer">
      <nav aria-label="Photography collections">
        {chapters.map(({ id, title }) => {
          const label = id === "scenes" ? "Atlas" : title;
          return (
            <a key={id} className="collection-roll" href={`${assetBase}?view=${id}`}
              aria-label={label} aria-current={view === id ? "page" : undefined}>
              <span className="roll-word" aria-hidden="true">
                {Array.from(label, (letter, i) => (
                  <span className="roll-char" key={i} data-letter={letter}>{letter}</span>
                ))}
              </span>
            </a>
          );
        })}
      </nav>
    </footer>
  );
}
