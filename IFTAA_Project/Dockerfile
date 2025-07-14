# Use the official .NET SDK image for build
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY IFTAA_Project/IFTAA_Project.csproj ./IFTAA_Project/
RUN dotnet restore ./IFTAA_Project/IFTAA_Project.csproj
COPY IFTAA_Project/. ./IFTAA_Project/
WORKDIR /src/IFTAA_Project
RUN dotnet publish -c Release -o /app/publish

# Use the official .NET runtime image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "IFTAA_Project.dll"] 