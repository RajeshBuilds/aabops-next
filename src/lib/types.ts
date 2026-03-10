export interface BundleMetadata {
  id: string;
  name: string;
  packageName: string;
  originalFilename: string;
  versionName: string;
  versionCode: string;
  uploadedAt: string;
  fileSizeBytes: number;
}

export interface AabInfo {
  packageName: string;
  versionName: string;
  versionCode: string;
  appLabel: string | null; // null if it's a resource reference like @string/app_name
}

export interface DeviceSpec {
  supportedAbis: string[];
  supportedLocales: string[];
  screenDensity: number;
  sdkVersion: number;
}

export interface BundleListResponse {
  bundles: BundleMetadata[];
}

export interface BuildApksRequest {
  deviceSpec: DeviceSpec;
}
