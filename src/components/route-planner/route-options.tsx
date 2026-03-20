'use client';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface RouteOptionsProps {
  detourToleranceKm: number;
  onDetourChange: (km: number) => void;
  arriveFullEnabled: boolean;
  onArriveFullChange: (enabled: boolean) => void;
  tankSizeLitres: number;
  onTankSizeChange: (litres: number) => void;
}

export function RouteOptions({
  detourToleranceKm,
  onDetourChange,
  arriveFullEnabled,
  onArriveFullChange,
  tankSizeLitres,
  onTankSizeChange,
}: RouteOptionsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Detour tolerance
          </label>
          <span className="text-sm text-muted-foreground">
            {detourToleranceKm === 0 ? 'On-route only' : `≤ ${detourToleranceKm} km`}
          </span>
        </div>
        <Slider
          min={0}
          max={20}
          step={1}
          value={[detourToleranceKm]}
          onValueChange={([val]) => onDetourChange(val)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>On-route only</span>
          <span>20 km detour</span>
        </div>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Arrive with a full tank</p>
            <p className="text-xs text-muted-foreground">
              Fill up enough so you arrive at the destination full — great for rental car returns
            </p>
          </div>
          <Switch
            checked={arriveFullEnabled}
            onCheckedChange={onArriveFullChange}
          />
        </div>
        {arriveFullEnabled && (
          <div className="flex items-center gap-2 pt-1">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Tank size (L):
            </label>
            <Input
              type="number"
              min={5}
              max={200}
              value={tankSizeLitres}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) onTankSizeChange(v);
              }}
              className="w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}
