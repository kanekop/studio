import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PeopleSearchFiltersProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    companyFilter: string;
    onCompanyFilterChange: (company: string) => void;
    availableCompanies: string[];
    onClearFilters: () => void;
}

export default function PeopleSearchFilters({
    searchQuery,
    onSearchQueryChange,
    companyFilter,
    onCompanyFilterChange,
    availableCompanies,
    onClearFilters
}: PeopleSearchFiltersProps) {
    const safeSearchQuery = searchQuery || '';
    const safeCompanyFilter = companyFilter || '';
    const safeAvailableCompanies = availableCompanies || [];
    const hasActiveFilters = safeSearchQuery || safeCompanyFilter;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                {/* 検索バー */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="名前、メール、メモなどで検索..."
                        value={safeSearchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* フィルター */}
                <div className="flex gap-2">
                    <Select 
                        value={safeCompanyFilter || '__all__'} 
                        onValueChange={(value) => onCompanyFilterChange(value === '__all__' ? '' : value)}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="会社で絞り込み" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">すべての会社</SelectItem>
                            {safeAvailableCompanies.map((company) => (
                                <SelectItem key={company} value={company || '__unknown__'}>
                                    {company || '不明'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClearFilters}
                            className="shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* アクティブフィルター表示 */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                    {safeSearchQuery && (
                        <Badge variant="secondary" className="gap-2">
                            検索: {safeSearchQuery}
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onSearchQueryChange("")}
                            />
                        </Badge>
                    )}
                    {safeCompanyFilter && (
                        <Badge variant="secondary" className="gap-2">
                            会社: {safeCompanyFilter}
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onCompanyFilterChange("")}
                            />
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
} 