import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, FileText, Calendar, Globe, Tag } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  template_body: string;
  template_header: string;
  template_footer: string;
  whatsapp_status: string;
  system_status: string;
  media_type: string;
  language: string;
  category: string;
  creation_time: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
}

interface TemplateViewModalProps {
  template: Template | null;
  onClose: () => void;
}

const TemplateViewModal: React.FC<TemplateViewModalProps> = ({ template, onClose }) => {
  if (!template) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-700';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi'
    };
    return languages[code] || code;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Template Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>{template.template_name}</CardTitle>
              <CardDescription>Template Information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Category:</span>
                  <Badge variant="outline">{template.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Language:</span>
                  <Badge variant="outline">{getLanguageName(template.language)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(template.whatsapp_status)}>
                    {template.whatsapp_status || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Content */}
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>The actual content of the template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.template_header && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Header</h4>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    {template.template_header}
                  </div>
                </div>
              )}

              {template.template_body && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Body</h4>
                  <div className="p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                    {template.template_body}
                  </div>
                </div>
              )}

              {template.template_footer && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Footer</h4>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    {template.template_footer}
                  </div>
                </div>
              )}

              {!template.template_header && !template.template_body && !template.template_footer && (
                <div className="text-center py-8 text-muted-foreground">
                  No content available for this template
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-sm text-muted-foreground">System Status:</span>
                  <p>{template.system_status || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Media Type:</span>
                  <p>{template.media_type || 'Text'}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Creation Time:</span>
                  <p>{template.creation_time ? new Date(template.creation_time * 1000).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-sm text-muted-foreground">Last Updated:</span>
                  <p>{new Date(template.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateViewModal;
