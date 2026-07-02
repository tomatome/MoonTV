'use client';

import { useEffect, useRef, useState } from 'react';
import { getLiveGroups, LiveGroup, LiveSource } from '@/lib/live';
import Hls from 'hls.js';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function LivePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [currentSources, setCurrentSources] = useState<LiveSource[]>([]);
  const [currentSource, setCurrentSource] = useState<LiveSource | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [playError, setPlayError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // 加载数据
  useEffect(() => {
    getLiveGroups().then((data) => {
      if (data.length === 0) {
        setError('未配置直播源，请检查 live.txt 文件');
        setLoading(false);
        return;
      }
      setGroups(data);
      const firstGroup = data[0];
      setSelectedGroup(firstGroup.groupName);
      setExpandedGroups(new Set([firstGroup.groupName]));
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
    if (!expandedGroups.has(groupName)) {
      // 修正：避免直接展开 Set，使用 Array.from
      setExpandedGroups(new Set(Array.from(expandedGroups).concat(groupName)));
    }
    const group = groups.find(g => g.groupName === groupName);
    if (group) {
      const firstChannel = group.channels.keys().next().value;
      if (firstChannel) {
        const sources = group.channels.get(firstChannel) || [];
        selectChannel(firstChannel, sources);
      }
    }
  };

  // 切换频道
  const selectChannel = (channelName: string, sources: LiveSource[]) => {
    setSelectedChannel(channelName);
    setCurrentSources(sources);
    setPlayError(null);
    if (sources.length > 0) {
      setCurrentSource(sources[0]);
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    }
  };

  // 切换源
  const selectSource = (source: LiveSource) => {
    if (currentSource?.url === source.url) return;
    setCurrentSource(source);
    setPlayError(null);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  };

  // 展开/折叠分组
  const toggleGroup = (groupName: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupName)) newSet.delete(groupName);
    else newSet.add(groupName);
    setExpandedGroups(newSet);
  };

  // 当 currentSource 变化时重新初始化 HLS
  useEffect(() => {
    if (!currentSource) return;
    const { url } = currentSource;
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setIsPlayerReady(false);
    setPlayError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsPlayerReady(true);
        video.play().catch((err) => {
          console.warn('自动播放被阻止:', err);
          setPlayError('自动播放被阻止，请点击播放按钮');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setPlayError('播放失败，请检查直播源是否有效');
          console.error('HLS error:', data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsPlayerReady(true);
        video.play().catch((err) => {
          console.warn('自动播放被阻止:', err);
          setPlayError('自动播放被阻止，请点击播放按钮');
        });
      });
    } else {
      setPlayError('您的浏览器不支持 HLS 播放');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSource]);

  const getCurrentGroup = () => groups.find(g => g.groupName === selectedGroup);
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
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              muted
              playsInline
            />
            {currentSource && currentSource.resolution && (
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                {currentSource.resolution}
              </div>
            )}
            {playError && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-600/80 text-white text-sm px-4 py-2 rounded shadow-lg">
                {playError}
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
