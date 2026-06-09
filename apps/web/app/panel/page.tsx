import StaffPanel from '@/components/staff-panel/StaffPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'THE OBJECT — панель бармена',
  description: 'Telegram Mini App для управления сменой и заказами.',
};

// Telegram Web App SDK подключается клиентским скриптом, чтобы window.Telegram
// был доступен сразу при монтировании StaffPanel.
export default function PanelPage() {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" async />
      <StaffPanel />
    </>
  );
}
