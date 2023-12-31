export namespace GunsAPI {
  export interface CameraSource {
    name: string;
    is_active: boolean;
    id: number;
    deleted_at: string | null;
    url: string;
    mmtx_name: string;
  }
  export interface CameraSourceCreate {
    name: string;
    is_active: boolean;
    private_url: string;
  }
  export interface CameraSourceUpdate {
    name?: string;
    is_active?: boolean;
  }
  export interface File {
    name: string;
    content_type: string;
    id: number;
    s3_bucket: string;
    s3_key: string;
  }
  export interface FileCreate {
    name: string;
    content_type: string;
  }
  export interface FileCreateResponse {
    file: GunsAPI.File;
    s3_presigned_fields: {};
  }
  export interface HTTPValidationError {
    detail?: GunsAPI.ValidationError[];
  }
  export interface Inference {
    t: number;
    hits: GunsAPI.InferenceHit[];
    id: number;
  }
  export interface InferenceHit {
    x: number;
    y: number;
    w: number;
    h: number;
    c: number;
    track_id: number | null;
    id: number;
  }
  export interface Result {
    ok: boolean;
  }
  export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
  }
  export interface VideoSource {
    name: string;
    is_active: boolean;
    id: number;
    deleted_at: string | null;
    file: GunsAPI.File;
    t_start: number;
  }
  export interface VideoSourceCreate {
    name: string;
    is_active: boolean;
    file_id: number;
  }
  export interface VideoSourceUpdate {
    name?: string;
    is_active?: boolean;
  }
}

export interface GunsAPI {
  version: '1';
  routes: {
    '/v1/files': {
      POST: {
        body: GunsAPI.FileCreate;
        response: GunsAPI.FileCreateResponse;
      };
    };
    '/v1/video-sources': {
      GET: {
        response: GunsAPI.VideoSource[];
      };
      POST: {
        body: GunsAPI.VideoSourceCreate;
        response: GunsAPI.VideoSource;
      };
    };
    '/v1/video-sources/{source_id}': {
      DELETE: {
        params: {
          source_id: number;
        };
        response: GunsAPI.Result;
      };
      PATCH: {
        body: GunsAPI.VideoSourceUpdate;
        params: {
          source_id: number;
        };
        response: GunsAPI.VideoSource;
      };
    };
    '/v1/video-sources/{source_id}/tasks/infer': {
      POST: {
        params: {
          source_id: number;
        };
        response: GunsAPI.VideoSource;
      };
    };
    '/v1/video-sources/{source_id}/inferences': {
      GET: {
        params: {
          source_id: number;
        };
        query?: {
          since_t?: number;
          limit?: number;
        };
        response: GunsAPI.Inference[];
      };
    };
    '/v1/camera-sources': {
      GET: {
        response: GunsAPI.CameraSource[];
      };
      POST: {
        body: GunsAPI.CameraSourceCreate;
        response: GunsAPI.CameraSource;
      };
    };
    '/v1/camera-sources/{source_id}': {
      DELETE: {
        params: {
          source_id: number;
        };
        response: GunsAPI.Result;
      };
      PATCH: {
        body: GunsAPI.CameraSourceUpdate;
        params: {
          source_id: number;
        };
        response: GunsAPI.CameraSource;
      };
    };
    '/v1/camera-sources/{source_id}/tasks/infer': {
      POST: {
        params: {
          source_id: number;
        };
        response: GunsAPI.CameraSource;
      };
    };
    '/v1/camera-sources/{source_id}/inferences': {
      GET: {
        params: {
          source_id: number;
        };
        query?: {
          since_t?: number;
          limit?: number;
        };
        response: GunsAPI.Inference[];
      };
    };
  };
}
