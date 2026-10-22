import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { walletService } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  X,
  ShieldAlert,
  LifeBuoy,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface SupportedChain {
  id: string;
  name: string;
  format: 'base58' | 'hex';
  example: string;
  isEvm: boolean;
}

const DEFAULT_CHAINS: SupportedChain[] = [
  { id: 'SOLANA', name: 'Solana', format: 'base58', example: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx', isEvm: false },
  { id: 'BASE', name: 'Base', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'ETHEREUM', name: 'Ethereum', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'POLYGON', name: 'Polygon', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'BSC', name: 'BNB Smart Chain (BSC)', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'ARBITRUM', name: 'Arbitrum One', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'OPTIMISM', name: 'Optimism (OP Mainnet)', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'AVALANCHE', name: 'Avalanche C-Chain', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'MONAD', name: 'Monad', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'GNOSIS', name: 'Gnosis', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
  { id: 'PLASMA', name: 'Plasma', format: 'hex', example: '0x4357efdfF55c30d68F0D327491Bd810D805749F5', isEvm: true },
];

interface RescueTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSolanaAddress?: string | null;
  onSuccess?: () => void;
}

export function RescueTokenModal({
  isOpen,
  onClose,
  userSolanaAddress,
  onSuccess,
}: RescueTokenModalProps) {
  const isMobile = useIsMobile();

  const [chains, setChains] = useState<SupportedChain[]>(DEFAULT_CHAINS);
  const [selectedChainId, setSelectedChainId] = useState<string>('SOLANA');
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Tab view: 'rescue' or 'history'
  const [activeTab, setActiveTab] = useState<'rescue' | 'history'>('rescue');
  const [rescueHistory, setRescueHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch supported chains from server if available
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    walletService
      .getRescueSupportedChains()
      .then((res) => {
        if (isMounted && res.data?.data?.chains) {
          setChains(res.data.data.chains);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_CHAINS
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load history when tab changes
  useEffect(() => {
    if (!isOpen || activeTab !== 'history') return;
    setIsLoadingHistory(true);
    walletService
      .getRescueHistory({ page: 1, limit: 10 })
      .then((res) => {
        setRescueHistory(res.data?.data?.rescues || []);
      })
      .catch((err) => {
        console.warn('Failed to load rescue history:', err.message);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [isOpen, activeTab]);

  const selectedChain = chains.find((c) => c.id === selectedChainId) || chains[0];

  // Address validation
  const validateAddress = (val: string, chain: SupportedChain): boolean => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (chain.format === 'base58') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
    }
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  };

  const isTokenValid = validateAddress(tokenAddress, selectedChain);
  const isRecipientValid = validateAddress(recipient, selectedChain);

  // Self-send check: Destination recipient cannot be user's own Switch address
  const isSelfSend =
    userSolanaAddress &&
    selectedChainId === 'SOLANA' &&
    recipient.trim().toLowerCase() === userSolanaAddress.trim().toLowerCase();

  const isFormValid =
    isTokenValid && isRecipientValid && !isSelfSend && isConfirmed && !isSubmitting;

  const handleResetForm = () => {
    setTokenAddress('');
    setRecipient('');
    setIsConfirmed(false);
    setErrorMessage(null);
    setSuccessData(null);
  };

  const handleModalClose = () => {
    handleResetForm();
    onClose();
  };

  const handleRescueSubmit = async () => {
    if (!isFormValid) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await walletService.rescueToken({
        blockchain: selectedChainId,
        tokenAddress: tokenAddress.trim(),
        recipient: recipient.trim(),
      });

      setSuccessData(response.data?.data || { success: true });
      toast.success('Token rescue initiated successfully');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to initiate token rescue';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Structured Content
  const content = (
    <div className="flex flex-col h-full max-h-[90dvh] sm:max-h-[85vh] overflow-hidden text-gray-900 dark:text-gray-100 selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Header Bar */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 pt-1 border-b border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#1a1b1c]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center shrink-0">
            <LifeBuoy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Token Rescue
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recover unsupported tokens to an external wallet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleModalClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs: Rescue vs History */}
      <div className="flex items-center gap-2 border-b border-[#DADDE1] dark:border-[#2f3032] pt-2 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('rescue')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'rescue'
              ? 'bg-[#9747FF] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          Rescue Token
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'history'
              ? 'bg-[#9747FF] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          Rescue History
        </button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {activeTab === 'history' ? (
          /* History View */
          <div className="space-y-3">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#9747FF] mb-2" />
                <p className="text-xs text-gray-500">Loading rescue history...</p>
              </div>
            ) : rescueHistory.length > 0 ? (
              <div className="space-y-2.5">
                {rescueHistory.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 uppercase">
                        {item.blockchain}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md font-semibold text-[11px] capitalize',
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : item.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-red-50 text-red-700 border border-red-200/60'
                        )}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-gray-600">
                      <p className="truncate">
                        <span className="font-medium text-gray-500">Token: </span>
                        <code className="text-gray-800 font-mono text-[11px]">
                          {item.tokenAddress}
                        </code>
                      </p>
                      <p className="truncate">
                        <span className="font-medium text-gray-500">Recipient: </span>
                        <code className="text-gray-800 font-mono text-[11px]">
                          {item.recipient}
                        </code>
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-400 pt-1">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <p className="text-sm font-semibold text-gray-700">No rescue history</p>
                <p className="text-xs text-gray-500 mt-1">
                  Previous token rescue requests will appear here.
                </p>
              </div>
            )}
          </div>
        ) : successData ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">
                Token Rescue Initiated
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                OnSwitch is processing the rescue transfer to your specified external wallet.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Network</span>
                <span className="font-semibold text-gray-900 uppercase">
                  {selectedChainId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Destination</span>
                <span className="font-mono text-gray-900 truncate max-w-[180px]">
                  {recipient}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Status</span>
                <span className="font-semibold text-emerald-700">
                  {successData.status || 'Completed'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                Rescue Another Token
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="flex-1 h-11 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <div className="space-y-4">
            {/* Informational Guidance Notice */}
            <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
              <ShieldAlert className="w-4 h-4 text-[#9747FF] shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold">Unified Balance vs Unsupported Tokens</p>
                <p className="text-purple-800/90">
                  Only <strong>USDC and USDT</strong> accumulate toward your spendable balance.
                  If any other token (alternate ERC-20, SPL token, or airdropped asset) was sent
                  to your deposit address, you can safely transfer it to an external wallet you control.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50/90 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Blockchain Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Blockchain Network
              </label>
              <div className="relative">
                <select
                  value={selectedChainId}
                  onChange={(e) => {
                    setSelectedChainId(e.target.value);
                    setTokenAddress('');
                    setRecipient('');
                    setErrorMessage(null);
                  }}
                  className="w-full h-11 px-3 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#9747FF]/20 focus:border-[#9747FF] transition-all cursor-pointer pr-10"
                >
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} ({chain.id})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Token Contract / Mint Address Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  Token Contract / Mint Address
                </label>
                <span className="text-[11px] text-gray-400">
                  {selectedChain.format === 'base58' ? 'Base58 Address' : '0x Hex Address'}
                </span>
              </div>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder={selectedChain.example}
                className={cn(
                  'w-full h-11 px-3 bg-white border rounded-xl text-xs font-mono text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all',
                  tokenAddress && !isTokenValid
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 focus:border-[#9747FF] focus:ring-[#9747FF]/20'
                )}
              />
              {tokenAddress && !isTokenValid && (
                <p className="text-[11px] text-red-600">
                  {selectedChain.format === 'base58'
                    ? 'Must be a valid Solana Base58 token mint (32-44 characters)'
                    : 'Must be a valid 0x hexadecimal contract address (42 characters)'}
                </p>
              )}
            </div>

            {/* Destination Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">
                  External Destination Address
                </label>
                <span className="text-[11px] text-gray-400">Must be your external wallet</span>
              </div>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Paste destination wallet address"
                className={cn(
                  'w-full h-11 px-3 bg-white border rounded-xl text-xs font-mono text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all',
                  (recipient && !isRecipientValid) || isSelfSend
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 focus:border-[#9747FF] focus:ring-[#9747FF]/20'
                )}
              />
              {isSelfSend ? (
                <p className="text-[11px] text-red-600">
                  Destination cannot be your own Switch deposit address. Provide an external self-custody wallet address.
                </p>
              ) : recipient && !isRecipientValid ? (
                <p className="text-[11px] text-red-600">
                  {selectedChain.format === 'base58'
                    ? 'Must be a valid Solana Base58 address (32-44 characters)'
                    : 'Must be a valid 0x hexadecimal recipient address (42 characters)'}
                </p>
              ) : null}
            </div>

            {/* Confirmation & Irreversibility Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-[#9747FF] focus:ring-[#9747FF]"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I confirm that I own and control this external destination address on{' '}
                <strong className="text-gray-900">{selectedChain.name}</strong>. I understand that
                blockchain rescue transfers are irreversible.
              </span>
            </label>
          </div>
        )}
      </div>

      {/* 3. Action Footer */}
      {activeTab === 'rescue' && !successData && (
        <div className="shrink-0 bg-white dark:bg-[#1a1b1c] border-t border-[#DADDE1] dark:border-[#2f3032] pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
          <button
            type="button"
            onClick={handleRescueSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Rescue Request...</span>
              </>
            ) : (
              <span>Initiate Token Rescue</span>
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && handleModalClose()}
        repositionInputs={false}
      >
        <DrawerContent className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-t-2xl max-h-[90dvh] flex flex-col p-5 pb-0 border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Token Rescue</DrawerTitle>
          <DrawerDescription className="sr-only">
            Recover unsupported tokens to an external wallet
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-2xl max-h-[85vh] sm:max-w-[480px] flex flex-col p-6 pb-0 border border-[#DADDE1] dark:border-[#2f3032] shadow-xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Token Rescue</DialogTitle>
        <DialogDescription className="sr-only">
          Recover unsupported tokens to an external wallet
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
