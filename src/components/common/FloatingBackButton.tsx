type FloatingBackButtonProps = {
  label?: string;
  onClick: () => void;
};

export function FloatingBackButton({ label = "Retour", onClick }: FloatingBackButtonProps) {
  return (
    <button className="floating-back-button" type="button" onClick={onClick} aria-label={label}>
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
