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
                xs: '90%',
                sm: '80%',
                md: '70%',
                lg: '60%',
                xl: '50%',
                xxl: '40%',
            }}
        >
            {children}
        </Modal>
    );
}