'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { BrandDiscount } from '@/types';
import { Trash2, Plus, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

interface DiscountManagerProps {
  discounts: BrandDiscount[];
  onDiscountsChange: (discounts: BrandDiscount[]) => void;
  availableBrands?: string[];
}

export function DiscountManager({
  discounts,
  onDiscountsChange,
  availableBrands = []
}: DiscountManagerProps) {
  const [newBrand, setNewBrand] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [useCustomBrand, setUseCustomBrand] = useState(false);

  const handleAddDiscount = () => {
    const brand = useCustomBrand
      ? newBrand.trim().toUpperCase()
      : newBrand.toUpperCase();
    const discountValue = Number.parseFloat(newDiscount);

    if (!brand || Number.isNaN(discountValue) || discountValue < 0) {
      return;
    }

    // Check if brand already exists
    const existingIndex = discounts.findIndex((d) => d.brand === brand);

    if (existingIndex >= 0) {
      // Update existing discount
      const updated = [...discounts];
      updated[existingIndex] = { brand, discount: discountValue };
      onDiscountsChange(updated);
    } else {
      // Add new discount
      onDiscountsChange([...discounts, { brand, discount: discountValue }]);
    }

    setNewBrand('');
    setNewDiscount('');
    setUseCustomBrand(false);
  };

  const handleRemoveDiscount = (brand: string) => {
    onDiscountsChange(discounts.filter((d) => d.brand !== brand));
  };

  const handleUpdateDiscount = (brand: string, discount: number) => {
    const updated = discounts.map((d) =>
      d.brand === brand ? { ...d, discount } : d
    );
    onDiscountsChange(updated);
  };

  return (
    <div className='border rounded-lg'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <DollarSign className='h-5 w-5' />
          <h3 className='text-lg font-semibold'>Brand Discounts</h3>
          {discounts.length > 0 && (
            <span className='text-sm text-muted-foreground'>
              ({discounts.length} configured)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className='h-5 w-5' />
        ) : (
          <ChevronDown className='h-5 w-5' />
        )}
      </button>

      {isExpanded && (
        <div className='p-4 pt-0 space-y-4'>
          <div className='space-y-3'>
            {discounts.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No brand discounts configured. Add discounts below.
              </p>
            ) : (
              discounts.map((discount) => (
                <div
                  key={discount.brand}
                  className='flex items-center gap-2 p-2 rounded-md bg-muted/50'
                >
                  <div className='flex-1'>
                    <div className='font-medium text-sm'>{discount.brand}</div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      value={discount.discount}
                      onChange={(e) =>
                        handleUpdateDiscount(
                          discount.brand,
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                      min='0'
                      step='0.1'
                      className='w-24'
                      placeholder='cents'
                    />
                    <span className='text-sm text-muted-foreground'>¢/L</span>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleRemoveDiscount(discount.brand)}
                      className='h-8 w-8'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className='space-y-2 pt-2 border-t'>
            <div className='text-sm font-medium'>Add New Discount</div>
            
            {/* Toggle between dropdown and custom input */}
            <div className='flex items-center gap-2 mb-2'>
              <Button
                variant={useCustomBrand ? 'outline' : 'secondary'}
                size='sm'
                onClick={() => setUseCustomBrand(false)}
              >
                Select Brand
              </Button>
              <Button
                variant={useCustomBrand ? 'secondary' : 'outline'}
                size='sm'
                onClick={() => {
                  setUseCustomBrand(true);
                  setNewBrand('');
                }}
              >
                Custom Brand
              </Button>
            </div>

            <div className='flex gap-2'>
              {useCustomBrand ? (
                <Input
                  placeholder='Custom brand name'
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDiscount()}
                  className='flex-1'
                />
              ) : (
                <Select value={newBrand} onValueChange={setNewBrand}>
                  <SelectTrigger className='flex-1'>
                    <SelectValue placeholder='Select a brand' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.length > 0 ? (
                      availableBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value='no-brands' disabled>
                        No brands available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              
              <Input
                type='number'
                placeholder='Discount (cents)'
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDiscount()}
                min='0'
                step='0.1'
                className='w-32'
              />
              <Button
                onClick={handleAddDiscount}
                disabled={!newBrand.trim() || !newDiscount}
                size='icon'
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              {useCustomBrand
                ? 'Enter a custom brand name and discount amount in cents per litre'
                : 'Select a brand from the dropdown or use Custom Brand to enter your own'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
