/** Fond animé (blobs flous + grain) derrière toute l'application ; couleurs fournies par le thème visuel. */
export function Backdrop() {
  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
