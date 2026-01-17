import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Funcionario {
  id: string;
  nome: string;
  cpf?: string | null;
}

interface FuncionarioComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  funcionarios: Funcionario[];
  placeholder?: string;
}

export function FuncionarioCombobox({
  value,
  onValueChange,
  funcionarios,
  placeholder = "Selecione o funcionário",
}: FuncionarioComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedFuncionario = funcionarios.find((f) => f.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedFuncionario ? (
            <div className="flex flex-col items-start">
              <span>{selectedFuncionario.nome}</span>
              {selectedFuncionario.cpf && (
                <span className="text-xs text-muted-foreground">
                  CPF: {selectedFuncionario.cpf}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            // Custom filter to search by name or CPF
            const funcionario = funcionarios.find((f) => f.id === value);
            if (!funcionario) return 0;
            
            const searchLower = search.toLowerCase();
            const nameMatch = funcionario.nome?.toLowerCase().includes(searchLower);
            const cpfMatch = funcionario.cpf?.includes(search);
            
            return nameMatch || cpfMatch ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Digite o nome ou CPF..." />
          <CommandList>
            <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
            <CommandGroup>
              {funcionarios.map((funcionario) => (
                <CommandItem
                  key={funcionario.id}
                  value={funcionario.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === funcionario.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{funcionario.nome}</span>
                    {funcionario.cpf && (
                      <span className="text-xs text-muted-foreground">
                        CPF: {funcionario.cpf}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
