import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  initialEmail?: string;
  initialPassword?: string;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({
  isOpen,
  onClose,
  onLogin,
  initialEmail = '',
  initialPassword = ''
}) => {
  const [email, setEmail] = useState(() => localStorage.getItem('cvflow_email') || initialEmail);
  const [password, setPassword] = useState(() => localStorage.getItem('cvflow_password') || initialPassword);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('cvflow_remember') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // Валидация
    if (!email || !email.includes('@')) {
      setError('Пожалуйста, введите корректный email');
      return;
    }

    if (!password || password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    // Логика "Запомнить меня"
    if (rememberMe) {
        localStorage.setItem('cvflow_email', email);
        localStorage.setItem('cvflow_password', password);
        localStorage.setItem('cvflow_remember', 'true');
    } else {
        localStorage.removeItem('cvflow_email');
        localStorage.removeItem('cvflow_password');
        localStorage.removeItem('cvflow_remember');
    }

    setError('');
    onLogin(email, password);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Вход в аккаунт Lucru.md
          </DialogTitle>
          <DialogDescription>
            Введите данные для входа в аккаунт. Агент автоматически выполнит вход и сохранит сессию.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-10"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Запомнить меня */}
          <div className="flex items-center space-x-2 pt-1">
            <input 
              type="checkbox" 
              id="rememberMe" 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Label htmlFor="rememberMe" className="text-sm font-medium leading-none cursor-pointer">
              Запомнить данные для входа
            </Label>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Агент откроет браузер, войдет в ваш аккаунт и сохранит сессию для дальнейшего использования.
              Окно браузера закроется автоматически через 5 секунд после успешного входа.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!email || !password}
          >
            Войти в аккаунт
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

