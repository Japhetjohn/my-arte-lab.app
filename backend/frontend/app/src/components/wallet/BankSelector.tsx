import { useState, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Building2, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Bank {
  id: string;
  name: string;
  code: string;
  logo?: string;
}

interface BankSelectorProps {
  value?: string;
  onChange: (bank: Bank) => void;
  countryCode?: string;
  disabled?: boolean;
}

export function BankSelector({
  value,
  onChange,
  countryCode = 'NG',
  disabled = false,
}: BankSelectorProps) {
  const [open, setOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedBank = banks.find((bank) => bank.id === value);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/hostfi/banks/${countryCode}`);
        setBanks(response.data.banks || []);
      } catch (error) {
        toast.error('Failed to load banks');
        // Fallback banks for Nigeria
        setBanks([
          { id: '1', name: 'Access Bank', code: '044' },
          { id: '2', name: 'First Bank of Nigeria', code: '011' },
          { id: '3', name: 'Guaranty Trust Bank', code: '058' },
          { id: '4', name: 'United Bank for Africa', code: '033' },
          { id: '5', name: 'Zenith Bank', code: '057' },
          { id: '6', name: 'Fidelity Bank', code: '070' },
          { id: '7', name: 'Union Bank', code: '032' },
          { id: '8', name: 'Stanbic IBTC Bank', code: '221' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanks();
  }, [countryCode]);

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : selectedBank ? (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="truncate">{selectedBank.name}</span>
            </div>
          ) : (
            'Select bank...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" side="bottom" align="start" sideOffset={4}>
        <Command>
          <CommandInput
            placeholder="Search banks..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No bank found.</CommandEmpty>
            <CommandGroup>
              {filteredBanks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.name}
                  onSelect={() => {
                    onChange(bank);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="flex-1">{bank.name}</span>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === bank.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
