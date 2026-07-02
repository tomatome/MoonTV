'use client';

import { useEffect, useRef, useState } from 'react';
import { getLiveGroups, LiveGroup, LiveSource } from '@/lib/config';
import Hls from 'hls.js';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 当前选中的分组、频道、源
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [currentSources, setCurrentSources] = useState<LiveSource[]>([]);
  const [currentSource, setCurrentSource] = useState<LiveSource | null>(null);

  // 分组展开/折叠状态
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 加载直播源数据
  useEffect(() => {
    getLiveGroups().then((data) => {
      if (data.length === 0) {
        setError('未配置直播源，请检查 live.txt 文件');
        setLoading(false);
        return;
      }
      setGroups(data);

      // 默认选中第一个分组，并展开它
      const firstGroup = data[0];
      setSelectedGroup(firstGroup.groupName);
      setExpandedGroups(new Set([firstGroup.groupName]));

      // 默认选中该分组的第一个频道
      const firstChannel = firstGroup.channels.keys().next().value;
      if (firstChannel) {
        const sources = firstGroup.channels.get(firstChannel) || [];
        setSelectedChannel(firstChannel);
        setCurrentSources(sources);
        if (sources.length > 0) {
          setCurrentSource(sources[0]);
        }
      }
      setLoading(false);
    });
  }, []);

  // 切换分组
  const selectGroup = (groupName: string) => {
    setSelectedGroup(groupName);
    // 自动展开该分组
    if (!expandedGroups.has(groupName)) {
      const newSet = new Set(expandedGroups);
      newSet.add(groupName);
      setExpandedGroups(newSet);
    }
    // 选中该分组的第一个频道
    const group = groups.find(g => g.groupName === groupName);
    if (group) {
      const firstChannel = group.channels.keys().next().value;
      if (firstChannel) {
        const sources = group.channels.get(firstChannel) || [];
        setSelectedChannel(firstChannel);
        setCurrentSources(sources);
        if (sources.length > 0) {
          setCurrentSource(sources[0]);
        }
      }
    }
  };

  // 切换频道
  const selectChannel = (channelName: string, sources: LiveSource[]) => {
    setSelectedChannel(channelName);
    setCurrentSources(sources);
    if (sources.length > 0) {
      setCurrentSource(sources[0]);
    }
  };

  // 切换源
  const selectSource = (source: LiveSource) => {
    if (currentSource?.url === source.url) return;
    setCurrentSource(source);
  };

  // 切换分组展开/折叠
  const toggleGroup = (groupName: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupName)) newSet.delete(groupName);
    else newSet.add(groupName);
    setExpandedGroups(newSet);
  };

  // 当 currentSource 变化时播放
  useEffect(() => {
    if (!currentSource) return;
    const { url } = currentSource;
    const video = videoRef.current;
    if (!video) return;

    // 清理旧 HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSource]);

  // 获取当前选中的组
  const getCurrentGroup = () => groups.find(g => g.groupName === selectedGroup);
  // 获取当前频道所有源
  const getCurrentChannelSources = () => {
    const group = getCurrentGroup();
    if (!group) return [];
    return group.channels.get(selectedChannel) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-gray-400">加载直播源...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-white">
      <div className="flex flex-1 min-h-0">
        {/* 左侧分组列表 */}
        <div className="w-48 bg-gray-900/80 border-r border-gray-700 overflow-y-auto shrink-0">
          <div className="p-2 text-xs text-gray-400 border-b border-gray-700 sticky top-0 bg-gray-900/90 z-10">
            分组
          </div>
          {groups.map((g) => (
            <div key={g.groupName}>
              <div
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700/50 transition ${
                  selectedGroup === g.groupName ? 'bg-gray-700/30' : ''
                }`}
                onClick={() => selectGroup(g.groupName)}
              >
                <span className="text-sm truncate">{g.groupName}</span>
                <span
                  className="text-gray-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(g.groupName);
                  }}
                >
                  {expandedGroups.has(g.groupName) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </div>
              {expandedGroups.has(g.groupName) && (
                <div className="pl-4 border-l border-gray-800 ml-2">
                  {Array.from(g.channels.keys()).map((ch) => (
                    <div
                      key={ch}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-700/30 rounded ${
                        selectedGroup === g.groupName && selectedChannel === ch
                          ? 'bg-gray-700/40 text-white'
                          : 'text-gray-300'
                      }`}
                      onClick={() => {
                        const sources = g.channels.get(ch) || [];
                        selectChannel(ch, sources);
                      }}
                    >
                      {ch}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 右侧播放区域 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 视频播放器 */}
          <div className="relative bg-black flex-1 flex items-center justify-center min-h-[200px]">
            <video ref={videoRef} className="w-full h-full object-contain" controls autoPlay muted />
            {currentSource && currentSource.resolution && (
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                {currentSource.resolution}
              </div>
            )}
          </div>

          {/* 播放器下方：当前频道名和源切换 */}
          <div className="bg-gray-900 p-3 border-t border-gray-700">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-white font-medium text-sm truncate min-w-[60px]">
                {selectedChannel || '未选择频道'}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {getCurrentChannelSources().map((src, index) => (
                  <button
                    key={src.url}
                    onClick={() => selectSource(src)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      currentSource?.url === src.url
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {src.resolution || `源${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
