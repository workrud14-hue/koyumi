import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SIZE_DATA = [
  { size: "XS", chest: '34-36"', length: '27"', shoulder: '16"', sleeve: '8"' },
  { size: "S", chest: '36-38"', length: '28"', shoulder: '17"', sleeve: '8.5"' },
  { size: "M", chest: '38-40"', length: '29"', shoulder: '18"', sleeve: '9"' },
  { size: "L", chest: '40-42"', length: '30"', shoulder: '19"', sleeve: '9.5"' },
  { size: "XL", chest: '42-44"', length: '31"', shoulder: '20"', sleeve: '10"' },
  { size: "XXL", chest: '44-46"', length: '32"', shoulder: '21"', sleeve: '10.5"' },
];

export default function SizeGuide({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div
        className="mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant/20 bg-surface px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-signal">SIZE GUIDE</h2>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-outline">
              ALL MEASUREMENTS IN INCHES
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-outline-variant/20 text-outline transition-colors hover:text-signal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {/* How to Measure */}
          <div className="mb-8">
            <h3 className="mb-3 font-mono text-[11px] tracking-[0.15em] text-signal/90">
              HOW TO MEASURE
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  label: "CHEST",
                  desc: "Measure around the fullest part of your chest, under your arms.",
                },
                {
                  label: "LENGTH",
                  desc: "Measure from the highest point of the shoulder to the bottom hem.",
                },
                {
                  label: "SHOULDER",
                  desc: "Measure from one shoulder seam to the other across the back.",
                },
              ].map((tip) => (
                <div key={tip.label} className="border border-outline-variant/10 p-4">
                  <p className="mb-1 font-mono text-[10px] tracking-[0.15em] text-primary">
                    {tip.label}
                  </p>
                  <p className="font-body text-[12px] leading-relaxed text-shadow/60">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Size Table */}
          <h3 className="mb-3 font-mono text-[11px] tracking-[0.15em] text-signal/90">
            SIZE CHART
          </h3>
          <div className="overflow-x-auto border border-outline-variant/20">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container">
                  {["SIZE", "CHEST", "LENGTH", "SHOULDER", "SLEEVE"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-mono text-[10px] tracking-[0.1em] text-outline"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_DATA.map((row) => (
                  <tr key={row.size} className="border-b border-outline-variant/10">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-signal">
                      {row.size}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-shadow">{row.chest}</td>
                    <td className="px-4 py-3 font-mono text-sm text-shadow">{row.length}</td>
                    <td className="px-4 py-3 font-mono text-sm text-shadow">{row.shoulder}</td>
                    <td className="px-4 py-3 font-mono text-sm text-shadow">{row.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fit Notes */}
          <div className="mt-6 border border-outline-variant/10 p-4">
            <p className="mb-1 font-mono text-[10px] tracking-[0.15em] text-primary">
              FIT NOTE
            </p>
            <p className="font-body text-[12px] leading-relaxed text-shadow/60">
              KIYUMI pieces are designed with an oversized, relaxed fit. If you prefer
              a more tailored look, we recommend sizing down. Check individual product
              descriptions for specific fit notes.
            </p>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full border border-outline-variant/30 py-3 font-mono text-xs tracking-[0.1em] text-shadow transition-colors hover:text-signal"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
