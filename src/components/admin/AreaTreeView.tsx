import { useState } from "react";
import { ChevronDown, ChevronRight, Edit, Trash2, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Area } from "@/hooks/useAreas";

interface AreaTreeViewProps {
  areas: Area[];
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  level?: number;
}

function AreaTreeNode({
  area,
  onEdit,
  onDelete,
  level = 0,
}: {
  area: Area;
  onEdit: (area: Area) => void;
  onDelete: (area: Area) => void;
  level: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = area.children && area.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors",
          level > 0 && "ml-4"
        )}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </button>

        {/* Area icon */}
        <FolderTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        {/* Area name and cost center */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-medium text-sm truncate">{area.name}</span>
          {area.cost_center && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              CC: {area.cost_center}
            </span>
          )}
        </div>

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(area);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(area);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-border ml-4 pl-2">
          {area.children!.map((child) => (
            <AreaTreeNode
              key={child.id}
              area={child}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AreaTreeView({ areas, onEdit, onDelete, level = 0 }: AreaTreeViewProps) {
  if (areas.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Nenhuma área cadastrada
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {areas.map((area) => (
        <AreaTreeNode
          key={area.id}
          area={area}
          onEdit={onEdit}
          onDelete={onDelete}
          level={level}
        />
      ))}
    </div>
  );
}
