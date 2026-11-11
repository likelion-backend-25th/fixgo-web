import { splitMarkdownTables, type MarkdownTable } from "@/lib/markdownTable";
import { cn } from "@/lib/cn";

export function ChatMessageBody({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return <p className={cn(bubbleClass, "ml-auto bg-blue-600 text-white")}>{text}</p>;
  }
  if (text === "") {
    return <p className={cn(bubbleClass, "bg-neutral-100 text-neutral-900")}>답변을 작성하고 있습니다.</p>;
  }

  return (
    <div className="w-full space-y-2">
      {splitMarkdownTables(text).map((block, index) => (
        block.type === "text" ? (
          <p key={index} className={cn(bubbleClass, "bg-neutral-100 text-neutral-900")}>{block.text}</p>
        ) : (
          <MarkdownTableView key={index} table={block.table} />
        )
      ))}
    </div>
  );
}

const bubbleClass = "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap";

function MarkdownTableView({ table }: { table: MarkdownTable }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-neutral-100">
          <tr>
            {table.headers.map((header, index) => (
              <th key={index} className="border-b border-neutral-200 px-2 py-1.5 font-medium whitespace-nowrap text-neutral-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-neutral-200 px-2 py-1.5 text-neutral-900">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
