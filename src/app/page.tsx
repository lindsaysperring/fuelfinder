'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { notifications } from '@/components/notifications';
import { ThemeToggle } from '@/components/theme-toggle';
import { DiscountManager } from '@/components/discount-manager';
import { StationSearch } from '@/components/station-search';
import { RouteFinder } from '@/components/route-finder';
import { loadSettings, saveSettings } from '@/lib/utils/local-storage';
import type { BrandDiscount, Coordinates, SearchTab } from '@/types';

const SETTINGS_SAVE_DELAY = 1000;

const DEFAULT_SETTINGS = {
  fuelEconomy: 10,
  selectedFuelType: 'U91',
  fillAmount: 40,
  brandDiscounts: [
    { brand: 'AMPOL', discount: 8 },
    { brand: 'CALTEX', discount: 10 },
    { brand: 'ONTHERUN', discount: 2 }
  ]
};

const DEFAULT_LOCATION: Coordinates = { latitude: -34.9285, longitude: 138.6007 };

export default function Home() {
  const [activeTab, setActiveTab] = useState<SearchTab>('nearby');
  const [fuelEconomy, setFuelEconomy] = useState<number>(DEFAULT_SETTINGS.fuelEconomy);
  const [selectedFuelType, setSelectedFuelType] = useState<string>(DEFAULT_SETTINGS.selectedFuelType);
  const [fillAmount, setFillAmount] = useState<number>(DEFAULT_SETTINGS.fillAmount);
  const [brandDiscounts, setBrandDiscounts] = useState<BrandDiscount[]>(DEFAULT_SETTINGS.brandDiscounts);
  const [location, setLocation] = useState<Coordinates>(DEFAULT_LOCATION);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = loadSettings();
      if (saved) {
        if (saved.fuelEconomy) setFuelEconomy(saved.fuelEconomy);
        if (saved.selectedFuelType) setSelectedFuelType(saved.selectedFuelType);
        if (saved.fillAmount) setFillAmount(saved.fillAmount);
        if (saved.brandDiscounts) setBrandDiscounts(saved.brandDiscounts);
        if (saved.activeTab) setActiveTab(saved.activeTab as SearchTab);
        if (saved.lastLocation &&
            (saved.lastLocation.latitude !== DEFAULT_LOCATION.latitude ||
             saved.lastLocation.longitude !== DEFAULT_LOCATION.longitude)) {
          setLocation(saved.lastLocation);
        }
        notifications.showInfo('Loaded your saved preferences');
      }
    } catch {
      // Fall through to defaults
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        saveSettings({
          fuelEconomy,
          selectedFuelType,
          lastLocation: location,
          fillAmount,
          brandDiscounts,
          activeTab
        });
        notifications.settingsSaved();
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }, SETTINGS_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [fuelEconomy, selectedFuelType, fillAmount, brandDiscounts, activeTab, location]);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
  };

  return (
    <main className='container mx-auto p-4'>
      <div className='mb-6 space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Fuel Finder</h1>
            <p className='text-muted-foreground'>
              Find the cheapest petrol considering both price and travel cost.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <ThemeToggle />
          </div>
        </div>

        <div className='bg-muted flex rounded-lg p-1'>
          <button
            onClick={() => handleTabChange('nearby')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'nearby'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Search Near Me
          </button>
          <button
            onClick={() => handleTabChange('route')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'route'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Search Along Route
          </button>
        </div>

        {activeTab === 'nearby' && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div>
              <label className='mb-2 block text-sm font-medium'>
                Fuel Economy (L/100km)
              </label>
              <Input
                type='number'
                value={fuelEconomy}
                onChange={(e) => setFuelEconomy(Number(e.target.value))}
                min='0'
                step='0.1'
              />
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium'>Fuel Type</label>
              <Select
                value={selectedFuelType}
                onValueChange={setSelectedFuelType}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select fuel type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='U91'>Unleaded 91</SelectItem>
                  <SelectItem value='U95'>Unleaded 95</SelectItem>
                  <SelectItem value='U98'>Unleaded 98</SelectItem>
                  <SelectItem value='DIESEL'>Diesel</SelectItem>
                  <SelectItem value='LPG'>LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium'>
                Fill Amount (Liters)
              </label>
              <Input
                type='number'
                value={fillAmount}
                onChange={(e) => setFillAmount(Number(e.target.value))}
                min='0'
                step='1'
              />
            </div>
          </div>
        )}

        {activeTab === 'nearby' && (
          <div className='mt-4'>
            <DiscountManager
              discounts={brandDiscounts}
              onDiscountsChange={setBrandDiscounts}
              availableBrands={availableBrands}
            />
          </div>
        )}
      </div>

      {activeTab === 'nearby' && (
        <StationSearch
          fuelEconomy={fuelEconomy}
          selectedFuelType={selectedFuelType}
          fillAmount={fillAmount}
          brandDiscounts={brandDiscounts}
          location={location}
          onLocationChange={setLocation}
          onBrandsChange={setAvailableBrands}
        />
      )}

      {activeTab === 'route' && (
        <RouteFinder
          fuelEconomy={fuelEconomy}
          setFuelEconomy={setFuelEconomy}
          selectedFuelType={selectedFuelType}
          setSelectedFuelType={setSelectedFuelType}
          fillAmount={fillAmount}
          setFillAmount={setFillAmount}
          brandDiscounts={brandDiscounts}
          setBrandDiscounts={setBrandDiscounts}
        />
      )}
    </main>
  );
}