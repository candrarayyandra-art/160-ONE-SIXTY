import React, { useState } from 'react';
import { Lock, X, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, setCurrentUser, logAudit } = useApp();
  const [selectedUser, setSelectedUser] = useState<User | null>(currentUser);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPinInput('');
    setErrorMsg('');
  };

  const handleKeypadClick = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleVerifyPin = async () => {
    if (!selectedUser) {
      setErrorMsg('Pilih pengguna terlebih dahulu');
      return;
    }

    if (pinInput === selectedUser.pin) {
      setCurrentUser(selectedUser);
      await logAudit('LOGIN', 'AUTENTIKASI', `User ${selectedUser.name} (${selectedUser.role}) berhasil masuk`);
      onClose();
    } else {
      setErrorMsg('PIN yang Anda masukkan salah!');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Ganti Pengguna</h3>
              <p className="text-[11px] text-slate-500">Pilih akun dan masukkan PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Selection list */}
        <div className="py-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Pilih Pengguna
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col ${
                    isSelected
                      ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800 truncate">{u.name}</span>
                  <span className="text-[10px] font-semibold text-sky-600 truncate">{u.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN display (masked) */}
        <div className="py-2 text-center">
          <div className="flex justify-center gap-2.5 my-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  idx < pinInput.length ? 'bg-sky-600 scale-110' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold flex items-center justify-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}
        </div>

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2 my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeypadClick(digit)}
              className="py-3 text-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition"
          >
            Hapus
          </button>
          <button
            onClick={() => handleKeypadClick('0')}
            className="py-3 text-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleVerifyPin}
            className="py-3 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-2xl transition flex items-center justify-center shadow-md shadow-sky-600/20 active:scale-95"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
