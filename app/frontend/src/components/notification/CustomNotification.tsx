import React from 'react';
import { notification } from 'antd';
import type { NotificationArgsProps } from 'antd';

// Định nghĩa interface cho các props của component
interface NotificationProps {
  message: string;
  description?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number; // thời gian hiển thị (giây), 0 = không tự động ẩn
  pauseOnHover?: boolean;
  showProgress?: boolean;
  placement?: NotificationArgsProps['placement'];
  onClick?: () => void;
  onClose?: () => void;
}

// Hook tùy chỉnh để sử dụng notification
export const useCustomNotification = () => {
  const [api, contextHolder] = notification.useNotification();

  const showNotification = ({
    message,
    description,
    type = 'info',
    duration = 4.5,
    pauseOnHover = true,
    showProgress = true,
    placement = 'topRight',
    onClick,
    onClose,
  }: NotificationProps) => {
    api[type]({
      message,
      description,
      duration,
      pauseOnHover,
      showProgress,
      placement,
      onClick,
      onClose,
    });
  };

  return {
    showNotification,
    contextHolder,
  };
};

// Component wrapper để sử dụng trực tiếp
const CustomNotification: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { contextHolder } = useCustomNotification();
  
  return (
    <>
      {contextHolder}
      {children}
    </>
  );
};

export default CustomNotification;