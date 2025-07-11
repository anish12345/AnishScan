using MCPServer.Models;
using MCPServer.Models.DTOs;

namespace MCPServer.Services;

public interface IScanService
{
    Task<List<ScanRequest>> GetAllScanRequestsAsync();
    Task<ScanRequest?> GetScanRequestByIdAsync(string id);
    Task<ScanRequest> CreateScanRequestAsync(ScanRequestDto scanRequestDto);
    Task<bool> UpdateScanRequestStatusAsync(string id, string status);
    
    Task<List<ScanResult>> GetAllScanResultsAsync();
    Task<ScanResult?> GetScanResultByIdAsync(string id);
    Task<ScanResult?> GetScanResultByScanRequestIdAsync(string scanRequestId);
    Task<ScanResult> SubmitScanResultAsync(ScanResultSubmissionDto scanResultDto);
} 