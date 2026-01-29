import React from "react";
import { Path, Circle, G, Rect } from "react-native-svg";

/**
 * Navigation icon component props
 */
interface IconComponentProps {
  color: string;
}

/**
 * Type for navigation icon names
 */
export type NavigationIconName =
  | "notifications"
  | "settings"
  | "friends"
  | "groups"
  | "messages"
  | "activity"
  | "finance"
  | "analytics"
  | "arrow-down"
  | "arrow-up"
  | "expenses"
  | "chevron-right"
  | "logout";

/**
 * Custom SVG icons for navigation and features
 * Following the same pattern as category icons
 */

export const NotificationsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
      fill={color}
    />
  </G>
);

export const SettingsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      fill={color}
    />
  </G>
);

export const FriendsIcon = ({ color }: IconComponentProps) => (
  <G>
    {/* Left person */}
    <Circle cx="8" cy="6" r="3" fill={color} />
    <Path d="M8 12c-2.21 0-4 1.34-4 3v2h8v-2c0-1.66-1.79-3-4-3z" fill={color} />
    {/* Right person */}
    <Circle cx="16" cy="6" r="3" fill={color} />
    <Path
      d="M16 12c-2.21 0-4 1.34-4 3v2h8v-2c0-1.66-1.79-3-4-3z"
      fill={color}
    />
  </G>
);

export const GroupsIcon = ({ color }: IconComponentProps) => (
  <G>
    {/* Left person */}
    <Circle cx="7" cy="6" r="2.5" fill={color} />
    <Path
      d="M7 11.5c-1.66 0-3 1-3 2.25v2h6v-2c0-1.25-1.34-2.25-3-2.25z"
      fill={color}
    />
    {/* Center person */}
    <Circle cx="12" cy="6" r="2.5" fill={color} />
    <Path
      d="M12 11.5c-1.66 0-3 1-3 2.25v2h6v-2c0-1.25-1.34-2.25-3-2.25z"
      fill={color}
    />
    {/* Right person */}
    <Circle cx="17" cy="6" r="2.5" fill={color} />
    <Path
      d="M17 11.5c-1.66 0-3 1-3 2.25v2h6v-2c0-1.25-1.34-2.25-3-2.25z"
      fill={color}
    />
  </G>
);

export const MessagesIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
      fill={color}
    />
    <Circle cx="9" cy="10" r="1.5" fill={color} />
    <Circle cx="15" cy="10" r="1.5" fill={color} />
    <Path
      d="M12 13c1.33 0 2.53-.47 3.5-1.25-.97-.78-2.17-1.25-3.5-1.25s-2.53.47-3.5 1.25C9.47 12.53 10.67 13 12 13z"
      fill={color}
    />
  </G>
);

export const ActivityIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
      fill={color}
    />
  </G>
);

export const FinanceIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
      fill={color}
    />
    <Path d="M9.5 12h2v2h-2zm4 0h2v2h-2zm-8 0h2v2h-2z" fill={color} />
  </G>
);

export const AnalyticsIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
      fill={color}
    />
  </G>
);

export const ArrowDownIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
      fill={color}
    />
  </G>
);

export const ArrowUpIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"
      fill={color}
    />
  </G>
);

export const ExpensesIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
      fill={color}
    />
  </G>
);

export const ChevronRightIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M9.29 6.71a.996.996 0 0 0 0 1.41L13.17 12l-3.88 3.88a.996.996 0 1 0 1.41 1.41l4.59-4.59a.996.996 0 0 0 0-1.41L10.7 6.7c-.38-.38-1.02-.38-1.41.01z"
      fill={color}
    />
  </G>
);

export const LogoutIcon = ({ color }: IconComponentProps) => (
  <G>
    <Path
      d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
      fill={color}
    />
  </G>
);

/**
 * Map of navigation icon names to icon components
 */
export const navigationIconMap: Record<
  NavigationIconName,
  React.FC<IconComponentProps>
> = {
  notifications: NotificationsIcon,
  settings: SettingsIcon,
  friends: FriendsIcon,
  groups: GroupsIcon,
  messages: MessagesIcon,
  activity: ActivityIcon,
  finance: FinanceIcon,
  analytics: AnalyticsIcon,
  "arrow-down": ArrowDownIcon,
  "arrow-up": ArrowUpIcon,
  expenses: ExpensesIcon,
  "chevron-right": ChevronRightIcon,
  logout: LogoutIcon,
};
