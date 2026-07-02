// src/lib/live.ts
// 直播源相关独立模块

export type LiveSource = {
  resolution: string; // 分辨率标签，如 "4M1080" 或空字符串
  url: string;
};

export type LiveGroup = {
  groupName: string;   // 分组名，如 "陕西"
  channels: Map<string, LiveSource[]>; // 频道名 -> 源列表
};

/**
 * 解析一行直播源数据，提取分辨率标签和 URL
 */
const parseLine = (line: string): LiveSource | null => {
  const commaIndex = line.indexOf(',');
  if (commaIndex === -1) return null;
  const rawName = line.substring(0, commaIndex).trim();
  const url = line.substring(commaIndex + 1).trim();
  if (!url) return null;

  // 提取分辨率后缀（如 "4M1080", "576", "8M1080"）
  const match = rawName.match(/\s+([\d.]+[A-Z]*\d*)$/);
  const resolution = match ? match[1] : '';
  return { resolution, url };
};

/**
 * 从 /live.txt 读取并解析直播源，按分组-频道-源结构返回
 */
export const getLiveGroups = async (): Promise<LiveGroup[]> => {
  try {
    const response = await fetch('/live.txt');
    if (!response.ok) return [];
    const text = await response.text();
    const lines = text.split('\n');

    const groups: LiveGroup[] = [];
    let currentGroup: LiveGroup | null = null;
    let currentChannelMap: Map<string, LiveSource[]> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') continue;

      // 检测分组标记： "分组名,#genre#"
      if (trimmed.endsWith(',#genre#')) {
        // 保存上一个组
        if (currentGroup && currentChannelMap) {
          currentGroup.channels = currentChannelMap;
          groups.push(currentGroup);
        }
        const groupName = trimmed.slice(0, trimmed.length - ',#genre#'.length).trim();
        currentGroup = { groupName, channels: new Map() };
        currentChannelMap = new Map();
        continue;
      }

      // 处理普通行（频道行）
      if (trimmed.includes(',')) {
        const source = parseLine(trimmed);
        if (!source || !currentChannelMap) continue;

        // 提取频道名（去除分辨率后缀）
        const rawName = trimmed.slice(0, trimmed.indexOf(',')).trim();
        const match = rawName.match(/\s+([\d.]+[A-Z]*\d*)$/);
        const channelName = match ? rawName.slice(0, match.index).trim() : rawName;
        if (!channelName) continue;

        if (!currentChannelMap.has(channelName)) {
          currentChannelMap.set(channelName, []);
        }
        currentChannelMap.get(channelName)!.push(source);
      }
    }

    // 保存最后一个组
    if (currentGroup && currentChannelMap) {
      currentGroup.channels = currentChannelMap;
      groups.push(currentGroup);
    }
    return groups;
  } catch {
    return [];
  }
};
