import { PDFDiffViewer } from "./components/PDFDiffViewer";

export default function App() {
  return (
    <div className="w-full h-full bg-[var(--color-neo-bg)] text-[var(--color-neo-white)] flex flex-col overflow-hidden font-[Inter] selection:bg-[var(--color-neo-lime)] selection:text-black">
      <PDFDiffViewer />
    </div>
  );
}

