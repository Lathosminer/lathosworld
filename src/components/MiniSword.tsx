export function MiniSword() {
  return (
    <span className="mini-sword" aria-hidden="true">
      <img className="mini-sword-anim gif-lightning-img" src="/sword-mini-anim.gif" alt="" width={112} height={112} />
      <img className="mini-sword-still" src="/sword-mini-still.png" alt="" width={112} height={112} />
    </span>
  );
}
