"use client";
import React, { useState } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp, Calendar, Heart, Users, Briefcase } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { AdvancedSearchParams } from '@/shared/types';

interface AdvancedPeopleSearchFiltersProps {
    searchParams: AdvancedSearchParams;
    onSearchParamsChange: (params: AdvancedSearchParams) => void;
    availableCompanies: string[];
    availableHobbies: string[];
    availableConnectionTypes: string[];
    onClearFilters: () => void;
}

export default function AdvancedPeopleSearchFilters({
    searchParams,
    onSearchParamsChange,
    availableCompanies,
    availableHobbies,
    availableConnectionTypes,
    onClearFilters
}: AdvancedPeopleSearchFiltersProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const [firstMetStartOpen, setFirstMetStartOpen] = useState(false);
    const [firstMetEndOpen, setFirstMetEndOpen] = useState(false);

    const safeSearchParams = searchParams || {};
    const safeAvailableCompanies = availableCompanies || [];
    const safeAvailableHobbies = availableHobbies || [];
    const safeAvailableConnectionTypes = availableConnectionTypes || [];

    const hasActiveFilters = 
        safeSearchParams.name ||
        safeSearchParams.company ||
        (safeSearchParams.hobbies && safeSearchParams.hobbies.length > 0) ||
        safeSearchParams.birthdayRange ||
        safeSearchParams.firstMetRange ||
        (safeSearchParams.connectionTypes && safeSearchParams.connectionTypes.length > 0) ||
        safeSearchParams.hasConnections !== undefined ||
        safeSearchParams.notes;

    const updateSearchParams = (updates: Partial<AdvancedSearchParams>) => {
        onSearchParamsChange({ ...safeSearchParams, ...updates });
    };

    const toggleHobby = (hobby: string) => {
        const currentHobbies = safeSearchParams.hobbies || [];
        const newHobbies = currentHobbies.includes(hobby)
            ? currentHobbies.filter(h => h !== hobby)
            : [...currentHobbies, hobby];
        updateSearchParams({ hobbies: newHobbies.length > 0 ? newHobbies : undefined });
    };

    const toggleConnectionType = (type: string) => {
        const currentTypes = safeSearchParams.connectionTypes || [];
        const newTypes = currentTypes.includes(type)
            ? currentTypes.filter(t => t !== type)
            : [...currentTypes, type];
        updateSearchParams({ connectionTypes: newTypes.length > 0 ? newTypes : undefined });
    };

    const setBirthdayRange = (start?: Date, end?: Date) => {
        if (start && end) {
            updateSearchParams({ birthdayRange: { start, end } });
        } else {
            updateSearchParams({ birthdayRange: undefined });
        }
    };

    const setFirstMetRange = (start?: Date, end?: Date) => {
        if (start && end) {
            updateSearchParams({ firstMetRange: { start, end } });
        } else {
            updateSearchParams({ firstMetRange: undefined });
        }
    };

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        検索・フィルター
                    </CardTitle>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <X className="h-4 w-4 mr-1" />
                            すべてクリア
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 基本検索 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>名前で検索</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="名前を入力..."
                                value={safeSearchParams.name || ''}
                                onChange={(e) => updateSearchParams({ name: e.target.value || undefined })}
                                className="pl-9 h-11" // 少し高くしてタッチしやすく
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>会社で絞り込み</Label>
                        <Select 
                            value={safeSearchParams.company || '__all__'} 
                            onValueChange={(value) => updateSearchParams({ company: value === '__all__' ? undefined : value })}
                        >
                            <SelectTrigger className="h-11"> {/* 少し高くしてタッチしやすく */}
                                <Briefcase className="h-4 w-4 mr-2 shrink-0" />
                                <SelectValue placeholder="会社を選択" />
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
                    </div>
                </div>

                {/* 高度な検索 */}
                <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-11 text-left"> {/* タッチしやすく */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 shrink-0" />
                                詳細フィルター
                            </div>
                            {isAdvancedOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                        {/* メモ検索 */}
                        <div className="space-y-2">
                            <Label>メモで検索</Label>
                            <Input
                                placeholder="メモの内容を入力..."
                                value={safeSearchParams.notes || ''}
                                onChange={(e) => updateSearchParams({ notes: e.target.value || undefined })}
                                className="h-11" // タッチしやすく
                            />
                        </div>

                        {/* 趣味フィルター */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                趣味で絞り込み
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {safeAvailableHobbies.map((hobby) => (
                                    <div key={hobby} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`hobby-${hobby}`}
                                            checked={(safeSearchParams.hobbies || []).includes(hobby)}
                                            onCheckedChange={() => toggleHobby(hobby)}
                                            className="h-5 w-5" // 少し大きく
                                        />
                                        <Label htmlFor={`hobby-${hobby}`} className="text-sm cursor-pointer flex-1 py-1">
                                            {hobby}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 誕生日範囲 */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                誕生日の範囲
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                                            {safeSearchParams.birthdayRange?.start ? (
                                                format(safeSearchParams.birthdayRange.start, "yyyy年MM月dd日")
                                            ) : (
                                                "開始日を選択"
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={safeSearchParams.birthdayRange?.start}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setBirthdayRange(date, safeSearchParams.birthdayRange?.end);
                                                }
                                                setStartDateOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <div className="flex items-center justify-center sm:justify-start">
                                    <span className="text-muted-foreground text-sm">〜</span>
                                </div>
                                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                                            {safeSearchParams.birthdayRange?.end ? (
                                                format(safeSearchParams.birthdayRange.end, "yyyy年MM月dd日")
                                            ) : (
                                                "終了日を選択"
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={safeSearchParams.birthdayRange?.end}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setBirthdayRange(safeSearchParams.birthdayRange?.start, date);
                                                }
                                                setEndDateOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* 初対面日範囲 */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                初対面日の範囲
                            </Label>
                            <div className="flex gap-2 items-center">
                                <Popover open={firstMetStartOpen} onOpenChange={setFirstMetStartOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            {safeSearchParams.firstMetRange?.start ? (
                                                format(safeSearchParams.firstMetRange.start, "yyyy年MM月dd日")
                                            ) : (
                                                "開始日を選択"
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={safeSearchParams.firstMetRange?.start}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setFirstMetRange(date, safeSearchParams.firstMetRange?.end);
                                                }
                                                setFirstMetStartOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <span className="text-muted-foreground">〜</span>
                                <Popover open={firstMetEndOpen} onOpenChange={setFirstMetEndOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            {safeSearchParams.firstMetRange?.end ? (
                                                format(safeSearchParams.firstMetRange.end, "yyyy年MM月dd日")
                                            ) : (
                                                "終了日を選択"
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={safeSearchParams.firstMetRange?.end}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setFirstMetRange(safeSearchParams.firstMetRange?.start, date);
                                                }
                                                setFirstMetEndOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* コネクションタイプフィルター */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                関係性で絞り込み
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {safeAvailableConnectionTypes.map((type) => (
                                    <div key={type} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`connection-${type}`}
                                            checked={(safeSearchParams.connectionTypes || []).includes(type)}
                                            onCheckedChange={() => toggleConnectionType(type)}
                                            className="h-5 w-5" // 少し大きく
                                        />
                                        <Label htmlFor={`connection-${type}`} className="text-sm cursor-pointer flex-1 py-1">
                                            {type}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* コネクション有無フィルター */}
                        <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50">
                            <Checkbox
                                id="has-connections"
                                checked={safeSearchParams.hasConnections === true}
                                onCheckedChange={(checked) => 
                                    updateSearchParams({ hasConnections: checked ? true : undefined })
                                }
                                className="h-5 w-5" // 少し大きく
                            />
                            <Label htmlFor="has-connections" className="cursor-pointer flex-1 py-1">
                                コネクションがある人のみ表示
                            </Label>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {/* アクティブフィルター表示 */}
                {hasActiveFilters && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">適用中のフィルター:</Label>
                        <div className="flex flex-wrap gap-2">
                            {safeSearchParams.name && (
                                <Badge variant="secondary" className="gap-2">
                                    名前: {safeSearchParams.name}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ name: undefined })}
                                    />
                                </Badge>
                            )}
                            {safeSearchParams.company && (
                                <Badge variant="secondary" className="gap-2">
                                    会社: {safeSearchParams.company}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ company: undefined })}
                                    />
                                </Badge>
                            )}
                            {safeSearchParams.notes && (
                                <Badge variant="secondary" className="gap-2">
                                    メモ: {safeSearchParams.notes}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ notes: undefined })}
                                    />
                                </Badge>
                            )}
                            {(safeSearchParams.hobbies || []).map((hobby) => (
                                <Badge key={hobby} variant="secondary" className="gap-2">
                                    趣味: {hobby}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => toggleHobby(hobby)}
                                    />
                                </Badge>
                            ))}
                            {(safeSearchParams.connectionTypes || []).map((type) => (
                                <Badge key={type} variant="secondary" className="gap-2">
                                    関係: {type}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => toggleConnectionType(type)}
                                    />
                                </Badge>
                            ))}
                            {safeSearchParams.birthdayRange && (
                                <Badge variant="secondary" className="gap-2">
                                    誕生日: {format(safeSearchParams.birthdayRange.start, "MM/dd")} - {format(safeSearchParams.birthdayRange.end, "MM/dd")}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ birthdayRange: undefined })}
                                    />
                                </Badge>
                            )}
                            {safeSearchParams.firstMetRange && (
                                <Badge variant="secondary" className="gap-2">
                                    初対面: {format(safeSearchParams.firstMetRange.start, "MM/dd")} - {format(safeSearchParams.firstMetRange.end, "MM/dd")}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ firstMetRange: undefined })}
                                    />
                                </Badge>
                            )}
                            {safeSearchParams.hasConnections && (
                                <Badge variant="secondary" className="gap-2">
                                    コネクションあり
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => updateSearchParams({ hasConnections: undefined })}
                                    />
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}