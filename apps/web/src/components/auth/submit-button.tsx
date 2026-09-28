import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Full-width primary action. While pending it shows only a spinner and keeps its width (MASTER §5). */
export function SubmitButton({
  label,
  pendingLabel,
  pending,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-label={pending ? pendingLabel : undefined}
      className="w-full text-[length:var(--text-ui-size)] whitespace-normal"
    >
      {pending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : label}
    </Button>
  );
}
