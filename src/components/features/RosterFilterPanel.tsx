import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/shared/utils/utils';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

interface RosterFilterPanelProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  peopleCountRange: { min: number | null; max: number | null };
  onPeopleCountRangeChange: (range: { min: number | null; max: number | null }) => void;
  maxPeopleCount: number;
  onReset: () => void;
}

export const RosterFilterPanel: React.FC<RosterFilterPanelProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
  dateRange,
  onDateRangeChange,
  peopleCountRange,
  onPeopleCountRangeChange,
  maxPeopleCount,
  onReset,
}) => {
  const hasActiveFilters = 
    selectedTags.length > 0 || 
    dateRange.start !== null || 
    dateRange.end !== null ||
    peopleCountRange.min !== null ||
    peopleCountRange.max !== null;

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handlePeopleCountChange = (values: number[]) => {
    onPeopleCountRangeChange({
      min: values[0] === 0 ? null : values[0],
      max: values[1] === maxPeopleCount ? null : values[1],
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          フィルター
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
              {selectedTags.length + (dateRange.start ? 1 : 0) + (peopleCountRange.min !== null ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">フィルター設定</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 px-2 text-xs"
              >
                リセット
              </Button>
            )}
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label>タグ</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <label
                      htmlFor={`tag-${tag}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>期間</Label>
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.start ? (
                      format(dateRange.start, "PPP", { locale: ja })
                    ) : (
                      <span>開始日</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.start || undefined}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, start: date || null })
                    }
                    locale={ja}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.end ? (
                      format(dateRange.end, "PPP", { locale: ja })
                    ) : (
                      <span>終了日</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.end || undefined}
                    onSelect={(date) =>
                      onDateRangeChange({ ...dateRange, end: date || null })
                    }
                    locale={ja}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDateRangeChange({ start: null, end: null })}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  日付をクリア
                </Button>
              )}
            </div>
          </div>

          {/* People Count Filter */}
          <div className="space-y-2">
            <Label>人数</Label>
            <div className="px-2">
              <Slider
                value={[
                  peopleCountRange.min || 0,
                  peopleCountRange.max || maxPeopleCount,
                ]}
                onValueChange={handlePeopleCountChange}
                max={maxPeopleCount}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{peopleCountRange.min || 0}人</span>
                <span>{peopleCountRange.max || maxPeopleCount}人</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};