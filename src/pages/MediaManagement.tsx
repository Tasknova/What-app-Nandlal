import React, { useState, useMemo, useEffect } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { useClientAuth } from '@/hooks/useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Search, Upload, Download, Trash2, Image, Video, Music, FileText, Plus, Calendar, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const MediaManagement: React.FC = () => {
  const { media, isLoading, error, lastSync, syncMediaWithDatabase } = useMedia();
  const { client, getOriginalClientCredentials } = useClientAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    mediaType: 'image',
    identifier: '',
    description: '',
    mediaFile: null as File | null
  });
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaNameError, setMediaNameError] = useState<string>('');
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout);
      }
    };
  }, [duplicateCheckTimeout]);

  // Duplicate check function
  const checkMediaNameDuplicate = async (name: string) => {
    if (!name.trim() || !client) {
      setMediaNameError('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('media')
        .select('id')
        .eq('name', name.trim())
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking media name:', error);
        return;
      }

      if (data) {
        setMediaNameError('A media file with this name already exists');
      } else {
        setMediaNameError('');
      }
    } catch (error) {
      console.error('Error checking media name:', error);
    }
  };

  const filteredMedia = useMemo(() => {
    let filtered = media;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by media type
    if (selectedMediaType !== 'all') {
      filtered = filtered.filter(item => item.media_type === selectedMediaType);
    }

    return filtered;
  }, [media, searchTerm, selectedMediaType]);

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
  };

  const handleSyncMedia = async () => {
    await syncMediaWithDatabase();
  };

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       setUploadForm(prev => ({ ...prev, mediaFile: file }));
       
       // Create preview for images
       if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         reader.onload = (e) => {
           setFilePreview(e.target?.result as string);
         };
         reader.readAsDataURL(file);
       } else {
         setFilePreview(null);
       }
     } else {
       setFilePreview(null);
     }
   };

   const resetUploadForm = () => {
     setUploadForm({
       mediaType: 'image',
       identifier: '',
       description: '',
       mediaFile: null
     });
     setFilePreview(null);
     // Reset file input
     setTimeout(() => {
       const fileInput = document.getElementById('media-file') as HTMLInputElement;
       if (fileInput) fileInput.value = '';
     }, 100);
   };

  const handleUploadMedia = async () => {
    if (!client) {
      toast.error('Client data not available');
      return;
    }

    if (!uploadForm.identifier || !uploadForm.mediaFile) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check file size (limit to 1.5MB to stay under Vercel's 4.5MB limit when base64 encoded)
    const maxSize = 1.5 * 1024 * 1024; // 1.5MB
    if (uploadForm.mediaFile.size > maxSize) {
      toast.error('File size too large. Please select a file smaller than 1.5MB.');
      return;
    }

    setUploading(true);

    try {
      // Get original client credentials for API calls
      const originalCredentials = await getOriginalClientCredentials();
      if (!originalCredentials) {
        toast.error('Unable to fetch client credentials');
        return;
      }

      // Use FormData for proper file upload through proxy server
      const formData = new FormData();
      formData.append('userid', originalCredentials.user_id); // Use original client's user_id
      formData.append('wabaNumber', originalCredentials.whatsapp_number); // Use original client's WhatsApp number
      formData.append('output', 'json');
      formData.append('mediaType', uploadForm.mediaType);
      formData.append('identifier', uploadForm.identifier);
      formData.append('description', uploadForm.description || '');
      formData.append('mediaFile', uploadForm.mediaFile);

      // Make request to proxy server (not Vercel API)
      const response = await fetch('http://localhost:3001/api/upload-media', {
        method: 'POST',
        body: formData // Don't set Content-Type header, let browser set it with boundary
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Media uploaded successfully');
        // Close dialog and refresh media list
        setShowUploadDialog(false);
        resetUploadForm();
        await syncMediaWithDatabase();
      } else {
        console.error('Upload media error details:', data);
        let errorMessage = data.error || 'Failed to upload media';
        
        // Handle specific error cases
        if (response.status === 413) {
          errorMessage = 'File too large. Please select a smaller file.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid file format or missing required fields.';
        }
        
        const details = data.details ? `\nDetails: ${data.details}` : '';
        toast.error(`${errorMessage}${details}`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaItem: any) => {
    if (!client) {
      toast.error('Client data not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete the media "${mediaItem.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get original client credentials for API calls
      const originalCredentials = await getOriginalClientCredentials();
      if (!originalCredentials) {
        toast.error('Unable to fetch client credentials');
        return;
      }

      const response = await fetch('http://localhost:3001/api/delete-media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: originalCredentials.user_id, // Use original client's user_id
          mediaId: mediaItem.media_id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Media "${mediaItem.name}" deleted successfully`);
        await syncMediaWithDatabase();
      } else {
        toast.error(data.error || 'Failed to delete media');
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete media. Please try again.');
    }
  };

  const handleDownloadMedia = async (mediaItem: any) => {
    if (!client) {
      toast.error('Client data not available');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/download-media?userId=${client.user_id}&mediaId=${mediaItem.media_id}`, {
        method: 'GET'
      });

      if (response.ok) {
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mediaItem.name || `media_${mediaItem.media_id}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Media downloaded successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to download media');
      }
    } catch (error) {
      console.error('Error downloading media:', error);
      toast.error('Failed to download media. Please try again.');
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>Please log in to access media management.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Image className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Media Management</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Manage your WhatsApp media files
        </p>
        <div className="flex space-x-2 mt-6">
                        <Dialog open={showUploadDialog} onOpenChange={(open) => {
               setShowUploadDialog(open);
               if (!open) {
                 resetUploadForm();
               }
             }}>
             <DialogTrigger asChild>
               <Button>
                 <Plus className="h-4 w-4 mr-2" />
                 Add Media
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[500px]">
               <DialogHeader>
                 <DialogTitle className="flex items-center space-x-2">
                   <Upload className="h-5 w-5" />
                   <span>Upload New Media</span>
                 </DialogTitle>
                 <DialogDescription>
                   Upload media files to your WhatsApp account
                 </DialogDescription>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="media-type">Media Type</Label>
                     <Select value={uploadForm.mediaType} onValueChange={(value) => setUploadForm(prev => ({ ...prev, mediaType: value }))}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="image">Image</SelectItem>
                         <SelectItem value="video">Video</SelectItem>
                         <SelectItem value="audio">Audio</SelectItem>
                         <SelectItem value="document">Document</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="identifier">Identifier *</Label>
                     <Input
                       id="identifier"
                       placeholder="Enter media identifier"
                       value={uploadForm.identifier}
                       onChange={(e) => {
                         setUploadForm(prev => ({ ...prev, identifier: e.target.value }));
                         
                         // Clear previous timeout
                         if (duplicateCheckTimeout) {
                           clearTimeout(duplicateCheckTimeout);
                         }
                         
                         // Set new timeout for duplicate check
                         const timeout = setTimeout(() => {
                           checkMediaNameDuplicate(e.target.value);
                         }, 300);
                         
                         setDuplicateCheckTimeout(timeout);
                       }}
                       className={mediaNameError ? 'border-red-500' : ''}
                     />
                     {mediaNameError && (
                       <p className="text-sm text-red-500">{mediaNameError}</p>
                     )}
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="description">Description</Label>
                   <Textarea
                     id="description"
                     placeholder="Enter media description (optional)"
                     value={uploadForm.description}
                     onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                     rows={3}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="media-file">Media File *</Label>
                   <Input
                     id="media-file"
                     type="file"
                     onChange={handleFileChange}
                     accept={uploadForm.mediaType === 'image' ? 'image/*' : 
                             uploadForm.mediaType === 'video' ? 'video/*' : 
                             uploadForm.mediaType === 'audio' ? 'audio/*' : '*'}
                   />
                   {filePreview && (
                     <div className="mt-2">
                       <Label className="text-sm text-muted-foreground">Preview:</Label>
                       <div className="mt-1 border rounded-md p-2">
                         <img 
                           src={filePreview} 
                           alt="File preview" 
                           className="max-w-full h-32 object-contain rounded"
                         />
                       </div>
                     </div>
                   )}
                   {uploadForm.mediaFile && !filePreview && (
                     <div className="mt-2">
                       <Label className="text-sm text-muted-foreground">Selected file:</Label>
                       <div className="mt-1 text-sm text-muted-foreground">
                         {uploadForm.mediaFile.name} ({(uploadForm.mediaFile.size / 1024 / 1024).toFixed(2)} MB)
                       </div>
                     </div>
                   )}
                 </div>
                 <div className="flex justify-end space-x-2 pt-4">
                   <Button
                     variant="outline"
                     onClick={() => {
                       setShowUploadDialog(false);
                       resetUploadForm();
                     }}
                   >
                     Cancel
                   </Button>
                                       <Button 
                      onClick={handleUploadMedia}
                      disabled={uploading || !uploadForm.identifier || !uploadForm.mediaFile || !!mediaNameError}
                    >
                     {uploading ? (
                       <Loader2 className="h-4 w-4 animate-spin mr-2" />
                     ) : (
                       <Upload className="h-4 w-4 mr-2" />
                     )}
                     {uploading ? 'Uploading...' : 'Upload Media'}
                   </Button>
                 </div>
               </div>
             </DialogContent>
           </Dialog>
           <Button onClick={handleSyncMedia} disabled={isLoading}>
             {isLoading ? (
               <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
               <RefreshCw className="h-4 w-4" />
             )}
             {isLoading ? 'Syncing...' : 'Sync Media'}
           </Button>
         </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Total Media: {media.length}</span>
          <span>Images: {media.filter(m => m.media_type === 'image').length}</span>
          <span>Videos: {media.filter(m => m.media_type === 'video').length}</span>
          <span>Documents: {media.filter(m => m.media_type === 'document').length}</span>
        </div>
        {lastSync && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Last synced: {format(lastSync, 'MMM dd, yyyy HH:mm:ss')}</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search media by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by media type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMedia.map((mediaItem) => (
          <Card key={mediaItem.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getMediaTypeIcon(mediaItem.media_type)}
                  <Badge variant="outline" className="text-xs">
                    {mediaItem.media_type}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={
                      // Check for various possible approved status values
                      mediaItem.status === 'APPROVED' || 
                      mediaItem.status === 'approved' || 
                      mediaItem.status === 'enabled' || 
                      mediaItem.status === 'ENABLED' ||
                      mediaItem.status === 'active' ||
                      mediaItem.status === 'ACTIVE' ||
                      mediaItem.status === 'valid' ||
                      mediaItem.status === 'VALID'
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : // Check for various possible pending status values
                        mediaItem.status === 'PENDING' || 
                        mediaItem.status === 'pending' ||
                        mediaItem.status === 'processing' ||
                        mediaItem.status === 'PROCESSING'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : // Check for various possible rejected status values
                        mediaItem.status === 'REJECTED' || 
                        mediaItem.status === 'rejected' ||
                        mediaItem.status === 'failed' ||
                        mediaItem.status === 'FAILED' ||
                        mediaItem.status === 'invalid' ||
                        mediaItem.status === 'INVALID'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : // Default gray for unknown status
                        'bg-gray-100 text-gray-800 border-gray-200'
                    }
                  >
                    {mediaItem.status || 'No Status'}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => handleDownloadMedia(mediaItem)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Download media"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteMedia(mediaItem)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm truncate" title={mediaItem.name}>
                  {mediaItem.name}
                </h3>
                {mediaItem.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {mediaItem.description}
                  </p>
                )}
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created: {formatDate(mediaItem.created_at)}</span>
                </div>
                {mediaItem.media_id && (
                  <div className="text-xs text-muted-foreground">
                    ID: {mediaItem.media_id}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredMedia.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No media found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedMediaType !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Your media files will appear here once uploaded.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MediaManagement; 