'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Network, Search, Filter, Users, Heart, Briefcase, Home, Edit, Trash2, Plus, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Connection, Person } from '@/types';
import { useDialogManager } from '@/hooks/use-dialog-manager';

export default function ManageConnectionsPage() {
    const { allUserConnections, allUserPeople, isLoadingAllUserConnections, isLoadingAllUserPeople, deleteConnection } = useFaceRoster();
    const { openDialog } = useDialogManager();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [strengthFilter, setStrengthFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('created_desc');

    // コネクションの種類で分類するためのヘルパー関数
    const getConnectionCategory = (types: string[]) => {
        const familyTypes = ['parent', 'child', 'sibling', 'spouse', 'partner'];
        const workTypes = ['colleague', 'manager', 'reports_to', 'mentor', 'mentee'];
        
        if (types.some(type => familyTypes.includes(type))) return 'family';
        if (types.some(type => workTypes.includes(type))) return 'work';
        return 'general';
    };

    // アイコンを取得するヘルパー関数
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'family': return <Heart className="h-4 w-4" />;
            case 'work': return <Briefcase className="h-4 w-4" />;
            default: return <Users className="h-4 w-4" />;
        }
    };

    // 人物情報を取得するヘルパー関数
    const getPersonInfo = (personId: string): Person | null => {
        return allUserPeople?.find(p => p.id === personId) || null;
    };

    // フィルタリングとソート機能
    const filteredAndSortedConnections = useMemo(() => {
        if (!allUserConnections || !allUserPeople) return [];

        // フィルタリング
        let filtered = allUserConnections.filter(connection => {
            // 検索クエリでフィルタリング
            if (searchQuery) {
                const fromPerson = getPersonInfo(connection.fromPersonId);
                const toPerson = getPersonInfo(connection.toPersonId);
                const searchLower = searchQuery.toLowerCase();
                
                const matchesSearch = 
                    fromPerson?.name.toLowerCase().includes(searchLower) ||
                    toPerson?.name.toLowerCase().includes(searchLower) ||
                    connection.types.some(type => type.toLowerCase().includes(searchLower)) ||
                    connection.reasons?.some(reason => reason.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) return false;
            }

            // タイプでフィルタリング
            if (typeFilter !== 'all') {
                const category = getConnectionCategory(connection.types);
                if (category !== typeFilter) return false;
            }

            // 強さでフィルタリング
            if (strengthFilter !== 'all') {
                const strength = connection.strength || 0;
                switch (strengthFilter) {
                    case 'strong': return strength >= 4;
                    case 'medium': return strength >= 2 && strength < 4;
                    case 'weak': return strength < 2;
                    default: return true;
                }
            }

            return true;
        });

        // ソート処理
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'created_asc':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
                case 'created_desc':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                case 'strength_desc':
                    return (b.strength || 0) - (a.strength || 0);
                case 'strength_asc':
                    return (a.strength || 0) - (b.strength || 0);
                case 'name_asc':
                    const aFromPerson = getPersonInfo(a.fromPersonId);
                    const bFromPerson = getPersonInfo(b.fromPersonId);
                    return (aFromPerson?.name || '').localeCompare(bFromPerson?.name || '');
                case 'name_desc':
                    const aFromPersonDesc = getPersonInfo(a.fromPersonId);
                    const bFromPersonDesc = getPersonInfo(b.fromPersonId);
                    return (bFromPersonDesc?.name || '').localeCompare(aFromPersonDesc?.name || '');
                default:
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            }
        });

        return filtered;
    }, [allUserConnections, allUserPeople, searchQuery, typeFilter, strengthFilter, sortBy]);

    const handleEditConnection = (connection: Connection) => {
        openDialog('createConnection', { editingConnection: connection });
    };

    const handleDeleteConnection = async (connection: Connection) => {
        if (window.confirm('このコネクションを削除しますか？')) {
            try {
                await deleteConnection(connection.id);
            } catch (error) {
                console.error('コネクションの削除に失敗しました:', error);
            }
        }
    };

    const handleCreateNewConnection = () => {
        // 人物が2人以上いる場合のみ新規作成を許可
        if ((allUserPeople?.length || 0) < 2) {
            alert('コネクションを作成するには最低2人の人物が必要です。');
            return;
        }
        openDialog('createConnection', {});
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
                    <Network className="inline-block mr-3 h-8 w-8" />
                    Manage Connections
                </h1>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {filteredAndSortedConnections.length} connections found
                    </div>
                    <Button 
                        onClick={handleCreateNewConnection}
                        disabled={isLoadingAllUserPeople || (allUserPeople?.length || 0) < 2}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        新規作成
                    </Button>
                </div>
            </div>

            {/* フィルターセクション */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="mr-2 h-5 w-5" />
                        フィルター & 検索
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="人物名、関係タイプ、理由で検索..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="関係のタイプで絞り込み" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべてのタイプ</SelectItem>
                                <SelectItem value="general">一般的な関係</SelectItem>
                                <SelectItem value="family">家族・パートナー</SelectItem>
                                <SelectItem value="work">仕事関係</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={strengthFilter} onValueChange={setStrengthFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="関係の強さで絞り込み" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべての強さ</SelectItem>
                                <SelectItem value="strong">強い関係 (4-5)</SelectItem>
                                <SelectItem value="medium">中程度 (2-3)</SelectItem>
                                <SelectItem value="weak">弱い関係 (0-1)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger>
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="並び順" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created_desc">作成日（新しい順）</SelectItem>
                                <SelectItem value="created_asc">作成日（古い順）</SelectItem>
                                <SelectItem value="name_asc">人物名（昇順）</SelectItem>
                                <SelectItem value="name_desc">人物名（降順）</SelectItem>
                                <SelectItem value="strength_desc">関係の強さ（強い順）</SelectItem>
                                <SelectItem value="strength_asc">関係の強さ（弱い順）</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* コネクション一覧 */}
            {isLoadingAllUserConnections || isLoadingAllUserPeople ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">読み込み中...</div>
                    </CardContent>
                </Card>
            ) : filteredAndSortedConnections.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">
                            {searchQuery || typeFilter !== 'all' || strengthFilter !== 'all' 
                                ? '条件に一致するコネクションが見つかりません' 
                                : 'まだコネクションが登録されていません'}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedConnections.map((connection) => {
                        const fromPerson = getPersonInfo(connection.fromPersonId);
                        const toPerson = getPersonInfo(connection.toPersonId);
                        const category = getConnectionCategory(connection.types);
                        
                        return (
                            <Card key={connection.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                {getCategoryIcon(category)}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{fromPerson?.name || '不明な人物'}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="font-medium">{toPerson?.name || '不明な人物'}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {connection.types.map((type, index) => (
                                                    <Badge key={index} variant="secondary">{type}</Badge>
                                                ))}
                                            </div>
                                            
                                            {connection.reasons && connection.reasons.length > 0 && (
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    理由: {connection.reasons.join(', ')}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                {connection.strength !== null && connection.strength !== undefined && (
                                                    <span>強さ: {connection.strength}/5</span>
                                                )}
                                                <span>
                                                    作成: {connection.createdAt?.toDate?.()?.toLocaleDateString() || '不明'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditConnection(connection)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteConnection(connection)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 