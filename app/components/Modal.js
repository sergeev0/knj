import Link from "next/link";

export default function Modal({ title, eyebrow, children, closeHref = "/" }) {
  return (
    <div className="modal-layer" role="presentation">
      <Link className="modal-backdrop" href={closeHref} aria-label="Close modal" />
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id="modal-title">{title}</h2>
          </div>
          <Link className="icon-button" href={closeHref} aria-label="Close modal">
            x
          </Link>
        </header>
        {children}
      </section>
    </div>
  );
}

