'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Network, Search, Filter, Users, Heart, Briefcase, Home, Edit, Trash2, Plus, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFaceRoster } from '@/contexts/FaceRosterContext';
import { Connection, Person } from '@/types';
import { useDialogManager } from '@/hooks/use-dialog-manager';
import { useToast } from '@/hooks/use-toast';
import type { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default function ManageConnectionsPage() {
    const { allUserConnections, allUserPeople, isLoadingAllUserConnections, isLoadingAllUserPeople, deleteConnection } = useFaceRoster();
    const { openDialog } = useDialogManager();
    const { toast } = useToast();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [strengthFilter, setStrengthFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('created_desc');
    const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAllConnections, setShowAllConnections] = useState<boolean>(false);
    const [allFirestoreConnections, setAllFirestoreConnections] = useState<Connection[]>([]);
    const [isLoadingAllConnections, setIsLoadingAllConnections] = useState<boolean>(false);

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

    // 人物データのMapキャッシュ化（パフォーマンス改善）
    const peopleMap = useMemo(() => {
        const map = new Map<string, Person>();
        allUserPeople?.forEach(person => {
            if (person?.id) {
                map.set(person.id, person);
            }
        });
        return map;
    }, [allUserPeople]);

    // 安全な人物情報取得関数
    const getPersonInfo = useCallback((personId: string | null | undefined): Person | null => {
        if (!personId || typeof personId !== 'string') return null;
        return peopleMap.get(personId) || null;
    }, [peopleMap]);

    // Timestamp安全フォーマット関数
    const formatTimestamp = useCallback((timestamp: Timestamp | any): string => {
        try {
            if (timestamp && typeof timestamp.toDate === 'function') {
                return timestamp.toDate().toLocaleDateString();
            }
            if (timestamp && timestamp.seconds) {
                return new Date(timestamp.seconds * 1000).toLocaleDateString();
            }
            return '不明';
        } catch (error) {
            console.warn('Timestamp format error:', error);
            return '不明';
        }
    }, []);

    // 安全な文字列検索関数
    const safeStringIncludes = useCallback((str: string | null | undefined, search: string): boolean => {
        if (!str || typeof str !== 'string') return false;
        return str.toLowerCase().includes(search.toLowerCase());
    }, []);

    // Firestoreから直接すべてのコネクションを取得
    const fetchAllConnectionsFromFirestore = useCallback(async () => {
        if (isLoadingAllConnections) return;
        
        setIsLoadingAllConnections(true);
        setError(null);
        
        try {
            const connectionsQuery = query(
                collection(db, "connections"),
                orderBy("createdAt", "desc")
            );
            
            const snapshot = await getDocs(connectionsQuery);
            const connections: Connection[] = [];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data) {
                    connections.push({
                        id: doc.id,
                        ...data
                    } as Connection);
                }
            });
            
            setAllFirestoreConnections(connections);
            console.log('=== All Firestore Connections ===');
            console.log('Total connections in Firestore:', connections.length);
            console.log('Connections:', connections.map(c => ({
                id: c.id,
                from: c.fromPersonId,
                to: c.toPersonId,
                types: c.types
            })));
            console.log('================================');
            
        } catch (error) {
            console.error('Failed to fetch all connections:', error);
            setError('すべてのコネクションの取得に失敗しました。');
            toast({
                title: "取得エラー",
                description: "すべてのコネクションの取得に失敗しました",
                variant: "destructive"
            });
        } finally {
            setIsLoadingAllConnections(false);
        }
    }, [isLoadingAllConnections, toast]);

    // 堅牢なフィルタリングとソート機能
    const filteredAndSortedConnections = useMemo(() => {
        try {
            setError(null);
            
            // 表示するコネクションデータを決定
            const connectionsToProcess = showAllConnections 
                ? allFirestoreConnections 
                : allUserConnections;
            
            if (!Array.isArray(connectionsToProcess) || !Array.isArray(allUserPeople)) {
                return [];
            }

            // 有効なコネクションのみをフィルタリング（両方の人物が存在する）
            const validConnections = connectionsToProcess.filter(connection => {
                if (!connection?.id || !connection?.fromPersonId || !connection?.toPersonId) {
                    return false;
                }
                
                const fromPerson = getPersonInfo(connection.fromPersonId);
                const toPerson = getPersonInfo(connection.toPersonId);
                
                return fromPerson && toPerson;
            });

            // 検索・フィルタリング処理
            let filtered = validConnections.filter(connection => {
                try {
                    // 検索クエリでフィルタリング
                    if (searchQuery && searchQuery.trim()) {
                        const fromPerson = getPersonInfo(connection.fromPersonId);
                        const toPerson = getPersonInfo(connection.toPersonId);
                        const searchTerm = searchQuery.trim();
                        
                        const matchesSearch = 
                            safeStringIncludes(fromPerson?.name, searchTerm) ||
                            safeStringIncludes(toPerson?.name, searchTerm) ||
                            (Array.isArray(connection.types) && connection.types.some(type => 
                                safeStringIncludes(type, searchTerm)
                            )) ||
                            (Array.isArray(connection.reasons) && connection.reasons.some(reason => 
                                safeStringIncludes(reason, searchTerm)
                            ));
                        
                        if (!matchesSearch) return false;
                    }

                    // タイプでフィルタリング
                    if (typeFilter && typeFilter !== 'all') {
                        if (!Array.isArray(connection.types) || connection.types.length === 0) {
                            return false;
                        }
                        const category = getConnectionCategory(connection.types);
                        if (category !== typeFilter) return false;
                    }

                    // 強さでフィルタリング
                    if (strengthFilter && strengthFilter !== 'all') {
                        const strength = typeof connection.strength === 'number' ? connection.strength : 0;
                        switch (strengthFilter) {
                            case 'strong': return strength >= 4;
                            case 'medium': return strength >= 2 && strength < 4;
                            case 'weak': return strength < 2;
                            default: return true;
                        }
                    }

                    return true;
                } catch (filterError) {
                    console.warn('Filter error for connection:', connection.id, filterError);
                    return false;
                }
            });

            // 安全なソート処理
            filtered.sort((a, b) => {
                try {
                    switch (sortBy) {
                        case 'created_asc': {
                            const aTime = a.createdAt?.seconds || 0;
                            const bTime = b.createdAt?.seconds || 0;
                            return aTime - bTime;
                        }
                        case 'created_desc': {
                            const aTime = a.createdAt?.seconds || 0;
                            const bTime = b.createdAt?.seconds || 0;
                            return bTime - aTime;
                        }
                        case 'strength_desc': {
                            const aStrength = typeof a.strength === 'number' ? a.strength : 0;
                            const bStrength = typeof b.strength === 'number' ? b.strength : 0;
                            return bStrength - aStrength;
                        }
                        case 'strength_asc': {
                            const aStrength = typeof a.strength === 'number' ? a.strength : 0;
                            const bStrength = typeof b.strength === 'number' ? b.strength : 0;
                            return aStrength - bStrength;
                        }
                        case 'name_asc': {
                            const aFromPerson = getPersonInfo(a.fromPersonId);
                            const bFromPerson = getPersonInfo(b.fromPersonId);
                            const aName = aFromPerson?.name || '';
                            const bName = bFromPerson?.name || '';
                            return aName.localeCompare(bName);
                        }
                        case 'name_desc': {
                            const aFromPerson = getPersonInfo(a.fromPersonId);
                            const bFromPerson = getPersonInfo(b.fromPersonId);
                            const aName = aFromPerson?.name || '';
                            const bName = bFromPerson?.name || '';
                            return bName.localeCompare(aName);
                        }
                        default: {
                            const aTime = a.createdAt?.seconds || 0;
                            const bTime = b.createdAt?.seconds || 0;
                            return bTime - aTime;
                        }
                    }
                } catch (sortError) {
                    console.warn('Sort error:', sortError);
                    return 0;
                }
            });

            return filtered;
        } catch (globalError) {
            console.error('Filtering/sorting error:', globalError);
            setError('データの処理中にエラーが発生しました。ページを再読み込みしてください。');
            return [];
        }
    }, [allUserConnections, allUserPeople, allFirestoreConnections, showAllConnections, searchQuery, typeFilter, strengthFilter, sortBy, getPersonInfo, safeStringIncludes]);

    const handleEditConnection = (connection: Connection) => {
        openDialog('createConnection', { editingConnection: connection });
    };

    // 堅牢な削除ハンドラー
    const handleDeleteConnection = useCallback(async (connection: Connection) => {
        if (!connection?.id) {
            toast({
                title: "エラー",
                description: "無効なコネクションです",
                variant: "destructive"
            });
            return;
        }

        if (!window.confirm('このコネクションを削除しますか？')) return;
        
        setDeletingConnectionId(connection.id);
        setError(null);
        
        try {
            const success = await deleteConnection(connection.id);
            if (success) {
                toast({
                    title: "削除完了",
                    description: "コネクションを削除しました"
                });
            } else {
                throw new Error('Delete operation returned false');
            }
        } catch (error) {
            console.error('コネクションの削除エラー:', error);
            setError('コネクションの削除に失敗しました。再度お試しください。');
            toast({
                title: "削除失敗",
                description: "コネクションの削除に失敗しました",
                variant: "destructive"
            });
        } finally {
            setDeletingConnectionId(null);
        }
    }, [deleteConnection, toast]);

    // 安全な新規作成ハンドラー
    const handleCreateNewConnection = useCallback(() => {
        const peopleCount = Array.isArray(allUserPeople) ? allUserPeople.length : 0;
        
        if (peopleCount < 2) {
            toast({
                title: "作成不可",
                description: "コネクションを作成するには最低2人の人物が必要です。",
                variant: "destructive"
            });
            return;
        }
        
        try {
            openDialog('createConnection', {});
        } catch (error) {
            console.error('Dialog open error:', error);
            toast({
                title: "エラー",
                description: "ダイアログを開けませんでした",
                variant: "destructive"
            });
        }
    }, [allUserPeople, openDialog, toast]);

    // データの有効性チェック
    const hasValidData = Array.isArray(allUserConnections) && Array.isArray(allUserPeople);
    const hasAllConnectionsData = Array.isArray(allFirestoreConnections);
    const isLoading = isLoadingAllUserConnections || isLoadingAllUserPeople || isLoadingAllConnections;

    // デバッグ情報（開発用）
    React.useEffect(() => {
        if (hasValidData && !isLoading) {
            console.log('=== Connections Debug Info ===');
            console.log('Total people:', allUserPeople?.length || 0);
            console.log('People IDs:', allUserPeople?.map(p => p.id) || []);
            console.log('Total connections found:', allUserConnections?.length || 0);
            console.log('Connections:', allUserConnections?.map(c => ({
                id: c.id,
                from: c.fromPersonId,
                to: c.toPersonId,
                types: c.types
            })) || []);
            console.log('================================');
        }
    }, [allUserConnections, allUserPeople, hasValidData, isLoading]);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
                    <Network className="inline-block mr-3 h-8 w-8" />
                    Manage Connections
                </h1>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        {hasValidData ? `${filteredAndSortedConnections.length} connections found` : 'データ準備中...'}
                        {showAllConnections && (
                            <span className="block text-xs text-orange-600">
                                （すべてのコネクションを表示中）
                            </span>
                        )}
                    </div>
                    <Button 
                        onClick={handleCreateNewConnection}
                        disabled={isLoading || !hasValidData || (allUserPeople?.length || 0) < 2}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        新規作成
                    </Button>
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* コネクション表示モード切り替え */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                            <h3 className="font-medium mb-2">表示モード</h3>
                            <div className="text-sm text-muted-foreground">
                                {showAllConnections ? (
                                    <div>
                                        <p>🌐 <strong>すべてのコネクションを表示中</strong></p>
                                        <p>データベース内のすべてのコネクションが表示されます。</p>
                                        <p className="text-orange-600 mt-1">
                                            ⚠️ 一部のコネクションは人物情報が見つからない場合があります。
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p>👤 <strong>あなたの人物に関連するコネクションのみ表示中</strong></p>
                                        <p>あなたが追加した{allUserPeople?.length || 0}人の人物に関連するコネクションのみが表示されます。</p>
                                        {(allUserPeople?.length || 0) < 2 && (
                                            <p className="text-amber-600 mt-1">
                                                💡 より多くのコネクションを見るには、まず人物を追加してください。
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={showAllConnections ? "outline" : "default"}
                                size="sm"
                                onClick={() => setShowAllConnections(false)}
                                disabled={isLoading}
                            >
                                自分の人物のみ
                            </Button>
                            <Button
                                variant={showAllConnections ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setShowAllConnections(true);
                                    if (!hasAllConnectionsData && !isLoadingAllConnections) {
                                        fetchAllConnectionsFromFirestore();
                                    }
                                }}
                                disabled={isLoading}
                            >
                                すべて表示
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
            {isLoading ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">読み込み中...</div>
                    </CardContent>
                </Card>
            ) : !hasValidData ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">
                            データの読み込みに問題があります。ページを再読み込みしてください。
                        </div>
                    </CardContent>
                </Card>
            ) : filteredAndSortedConnections.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground">
                            {searchQuery?.trim() || typeFilter !== 'all' || strengthFilter !== 'all' 
                                ? '条件に一致するコネクションが見つかりません' 
                                : 'まだコネクションが登録されていません'}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedConnections.map((connection) => {
                        // 安全なコネクション情報取得
                        if (!connection?.id) {
                            console.warn('Invalid connection found:', connection);
                            return null;
                        }

                        const fromPerson = getPersonInfo(connection.fromPersonId);
                        const toPerson = getPersonInfo(connection.toPersonId);
                        
                        // 無効なコネクション（人物が見つからない）をスキップ
                        if (!fromPerson || !toPerson) {
                            console.warn('People not found for connection:', connection.id);
                            return null;
                        }

                        const category = getConnectionCategory(connection.types || []);
                        const isDeleting = deletingConnectionId === connection.id;
                        
                        return (
                            <Card key={connection.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                {getCategoryIcon(category)}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{fromPerson.name}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="font-medium">{toPerson.name}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {Array.isArray(connection.types) && connection.types.map((type, index) => (
                                                    <Badge key={`${connection.id}-type-${index}`} variant="secondary">
                                                        {type || '不明なタイプ'}
                                                    </Badge>
                                                ))}
                                            </div>
                                            
                                            {Array.isArray(connection.reasons) && connection.reasons.length > 0 && (
                                                <div className="text-sm text-muted-foreground mb-2">
                                                    理由: {connection.reasons.filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                {typeof connection.strength === 'number' && (
                                                    <span>強さ: {connection.strength}/5</span>
                                                )}
                                                <span>
                                                    作成: {formatTimestamp(connection.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditConnection(connection)}
                                                disabled={isDeleting}
                                                title="コネクションを編集"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteConnection(connection)}
                                                disabled={isDeleting}
                                                className="text-destructive hover:text-destructive"
                                                title="コネクションを削除"
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