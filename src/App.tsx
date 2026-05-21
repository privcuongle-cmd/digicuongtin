/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Invoices } from './pages/Invoices';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Import } from './pages/Import';
import { ImportHistory } from './pages/ImportHistory';
import { ReturnImport } from './pages/ReturnImport';
import { CreateReturnImport } from './pages/CreateReturnImport';
import { ReturnSales } from './pages/ReturnSales';
import { CreateReturnSales } from './pages/CreateReturnSales';
import { Reports } from './pages/Reports';
import { CashLedger } from './pages/CashLedger';
import { Maintenance } from './pages/Maintenance';
import { Tasks } from './pages/Tasks';
import { PriceSettings } from './pages/PriceSettings';
import { PrintSettings } from './pages/PrintSettings';
import { TelegramSettings } from './pages/TelegramSettings';
import Users from './pages/Users';
import { MoreMenu } from './pages/MoreMenu';
import { WifiManagement } from './pages/WifiManagement';
import { CameraManagement } from './pages/CameraManagement';
import { CameraInstallations } from './pages/CameraInstallations';
import { WalletManagement } from './pages/WalletManagement';
import { ImageGallery } from './pages/ImageGallery';
import { ShopSettings } from './pages/ShopSettings';
import { requestNotificationPermission } from './lib/notification';

import { ExternalSerials } from './pages/ExternalSerials';
import { Serials } from './pages/Serials';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAppContext();
  
  React.useEffect(() => {
    if (currentUser) {
      requestNotificationPermission();
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="serials" element={<Serials />} />
          <Route path="external-serials" element={<ExternalSerials />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="import" element={<Import />} />
          <Route path="import-history" element={<ImportHistory />} />
          <Route path="return-import" element={<ReturnImport />} />
          <Route path="create-return-import" element={<CreateReturnImport />} />
          <Route path="return-sales" element={<ReturnSales />} />
          <Route path="create-return-sales" element={<CreateReturnSales />} />
          <Route path="reports" element={<Reports />} />
          <Route path="cash-ledger" element={<CashLedger />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="wifi" element={<WifiManagement />} />
          <Route path="camera" element={<CameraManagement />} />
          <Route path="camera-installations" element={<CameraInstallations />} />
          <Route path="wallets" element={<WalletManagement />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="price-settings" element={<PriceSettings />} />
          <Route path="print-settings" element={<PrintSettings />} />
          <Route path="shop-settings" element={<ShopSettings />} />
          <Route path="telegram-settings" element={<TelegramSettings />} />
          <Route path="image-gallery" element={<ImageGallery />} />
          <Route path="users" element={<Users />} />
          <Route path="more" element={<MoreMenu />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  React.useEffect(() => {
    // Attempt to lock screen orientation to portrait if supported
    const lockScreen = async () => {
      try {
        const screenObj = (window.screen || {}) as any;
        const orientationObj = screenObj.orientation;
        if (orientationObj && typeof orientationObj.lock === 'function') {
          await orientationObj.lock('portrait');
        }
      } catch (err) {
        // Safe to ignore if browser sandboxes or fails the lock request
        console.warn('Unable to lock screen orientation:', err);
      }
    };
    lockScreen();
  }, []);

  return (
    <AppProvider>
      <AppRoutes />
      {/* Mobile Orientation Alert Overlay */}
      <div className="orientation-lock-overlay fixed inset-0 z-[9999999] hidden flex-col items-center justify-center bg-slate-950 text-white p-6 text-center select-none">
        <div className="p-4 bg-slate-900 rounded-full mb-6 relative animate-pulse">
          <svg className="w-12 h-12 text-blue-500 animate-spin" style={{ animationDuration: '3s' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2 uppercase tracking-wide text-blue-400">Vui lòng xoay dọc thiết bị</h3>
        <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
          Phần mềm Cường Tín tối ưu hiển thị theo chiều dọc trên điện thoại. Hãy đặt thiết bị thẳng đứng để tiếp tục sử dụng.
        </p>
      </div>
      <style>{`
        @media screen and (max-width: 932px) and (orientation: landscape) and (pointer: coarse) {
          .orientation-lock-overlay {
            display: flex !important;
          }
          body {
            overflow: hidden !important;
          }
        }
      `}</style>
    </AppProvider>
  );
}

