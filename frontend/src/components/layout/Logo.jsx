import { BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";

function Logo() {
  return (
    <Link to="/dashboard" className="inline-flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-accent/12 text-accent shadow-glow">
        <BrainCircuit className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-none text-text-primary">Rayyan AI</p>
        <p className="text-xs leading-none text-text-muted">Personal Intelligence OS</p>
      </div>
    </Link>
  );
}

export default Logo;

