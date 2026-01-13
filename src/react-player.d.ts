declare module "react-player" {
  import * as React from "react";

  export type ReactPlayerProps = {
    url?: any;
    playing?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    volume?: number;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    className?: string;
    onReady?: (...args: any[]) => void;
    onStart?: (...args: any[]) => void;
    onPlay?: (...args: any[]) => void;
    onPause?: (...args: any[]) => void;
    onEnded?: (...args: any[]) => void;
    onError?: (...args: any[]) => void;
    config?: any;
  };

  export default class ReactPlayer extends React.Component<ReactPlayerProps> {}
}
