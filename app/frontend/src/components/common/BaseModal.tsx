// src/components/common/BaseModal.tsx
import { Modal } from 'antd';
import type { ReactNode } from 'react';

type Props = {
    open: boolean;
    onCancel: () => void;
    onOk?: () => void;
    title?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode | null;  // Thêm prop footer
};

export default function BaseModal({
    open,
    onCancel,
    onOk,
    title,
    children,
    footer,  // Thêm footer vào destructuring
}: Props) {
    return (
        <Modal
            title={title}
            centered
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            footer={footer}  // Truyền footer vào Modal
            width={{
                xs: '95%',
                sm: '85%',
                md: '75%',
                lg: '65%',
                xl: '55%',
                xxl: '45%',
            }}
        >
            {children}
        </Modal>
    );
}