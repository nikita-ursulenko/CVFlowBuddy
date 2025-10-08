import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface CVUploadProps {
  onFileUpload: (file: File) => void;
}

export const CVUpload: React.FC<CVUploadProps> = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Проверяем тип файла
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Поддерживаются только файлы PDF и DOCX');
      return;
    }

    // Проверяем размер файла (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    setSelectedFile(file);
    toast.success(`Файл ${file.name} выбран для загрузки`);
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onFileUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedFile, onFileUpload]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Card className={`p-6 md:p-8 transition-all ${isDragOver ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex flex-col items-center justify-center space-y-3 md:space-y-4 text-center">
        <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        </div>
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-base md:text-lg font-semibold">Загрузите ваше резюме</h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            Поддерживаются форматы: PDF, DOCX (до 10MB)
          </p>
        </div>

        {/* Выбранный файл */}
        {selectedFile && (
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 text-sm" 
            size="sm"
            onClick={handleSelectFile}
          >
            <Upload className="h-4 w-4" />
            {selectedFile ? 'Выбрать другой файл' : 'Выбрать файл'}
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2 text-sm hidden sm:flex" 
            size="sm"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className="h-4 w-4" />
            Перетащите файл сюда
          </Button>

          {selectedFile && (
            <Button 
              onClick={handleUpload}
              className="gap-2 text-sm"
              size="sm"
            >
              <Upload className="h-4 w-4" />
              Загрузить
            </Button>
          )}
        </div>

        {/* Скрытый input для выбора файла */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </Card>
  );
};
